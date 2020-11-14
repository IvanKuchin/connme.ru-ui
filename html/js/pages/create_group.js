
var	create_group = create_group || {};

create_group = (function()
{
	"use strict";

	var		groupProfile = {};
	var		uploadImg;

	var	Init = function()
	{
		$("#submitButton").on("click", CreateNewGroupClickHandler);
		$("#cancelButton").on("click", function() { window.location.href="/feed?rand=" + system_calls.GetUUID(); });
		$("#fileupload").on("change", LogoUploadChangeHandler);
		InitImgUploaderClickHandler();
	};

	var InitImgUploaderClickHandler = function()
	{
		$("#logo img")	.on("click", function() { $("#fileupload").click(); })
						.addClass("cursor_pointer");
	};

	var	LogoUploadChangeHandler = function(e)
	{
		var		tmpURLObj = URL.createObjectURL(e.target.files[0]);
		var		imgLogo = new Image();

		//--- save file for future upload
		uploadImg = e.target.files[0];

		imgLogo.onload = function()
		{
			imgLogo.classList.add("max_100percent");
			$("#logo").empty().append(imgLogo);
			InitImgUploaderClickHandler();
		};

		imgLogo.src = tmpURLObj;
	};

	var	CreateNewGroupClickHandler = function()
	{
		var		title = $("#groupTitle").val();
		var		link = $("#groupLink").val();
		var		description = $("#groupDescription").val();
		var		tmp = link.match(/[\da-zA-Z_]+/) || [""];

		if(!title.length)
		{
			system_calls.PopoverError("groupTitle", "Выберите название группы");
		}
		else if(link.length != tmp[0].length) {
			system_calls.PopoverError("groupLink", "Может содержать только латинские буквы или цифры и _");
		}
		else if(link.length && link.length < 12)
		{
			// --- if link is empty it became equal to group id
			// --- maximum length group.id is 11
			// --- to avoid overlapping between group.links, it must be longer than 11 

			system_calls.PopoverError("groupLink", "Ссылка должна быть длиннее 10 символов");
		}
		else
		{
			$("#submitButton").button("loading");

			$.getJSON("/cgi-bin/group.cgi?action=AJAX_createGroup", {title:title, link:link, description:description})
				.done(function(groupData) {
					if(groupData.result === "success")
					{
						if(groupData.groups.length)
						{
							if(groupData.groups[0].id.length)
							{
								if(typeof(uploadImg) != "undefined")
								{
									var		formData = new FormData();

									formData.append("groupid", groupData.groups[0].id);
									formData.append("cover", uploadImg);

									$.ajax({
										url: "/cgi-bin/grouplogouploader.cgi",
										cache: false,
										contentType: false,
										processData: false,
										async: true,
										data: formData,
										type: "post",
										success: function() {
											window.location.href = "/group/" + groupData.groups[0].link + "?rand=" + system_calls.GetUUID();
										},
										error: function(imageData) {
											var		jsonObj = JSON.parse(imageData);
											console.error("AddGeneralCoverUploadChangeHandler:upload:failHandler:ERROR: " + jsonObj.textStatus);
										}
									});
								}
								else
								{
									// --- no image uploaded
									window.location.href = "/group/" + groupData.groups[0].link + "?rand=" + system_calls.GetUUID();
								}

							}
							else
							{
								console.error("CreateNewGroupClickHandler: ERROR: group.id is empty");
								window.location.href = "/groups_i_own_list?rand=" + system_calls.GetUUID();
							}
						}
						else
						{
							console.error("CreateNewGroupClickHandler: ERROR: groups array is empty");
							window.location.href = "/groups_i_own_list?rand=" + system_calls.GetUUID();
						}
					}
					else
					{
						if(groupData.description == "re-login required") 
							window.location.href = groupData.link;
						else
						{
							system_calls.PopoverError("submitButton", groupData.description);
						}

					}

					window.setTimeout(function(){ $("#submitButton").button("reset"); }, 500);
				})
				.fail(function()
					{
						console.error("CreateNewGroupClickHandler:ERROR: can't parse JSON response from server");
						
						window.setTimeout(function(){ $("#submitButton").button("reset"); }, 500);
					});
		}
	};

	var	creatableFuncReplaceSpanToInput = function () 
	{
		var	tag = $("<input>", {
			val: $(this).text(),
			type: "text",
			id: $(this).attr("id"),
			class: $(this).attr("class")
		});


		var keyupEventHandler = function(event) {
			/* Act on the event */
			var	keyPressed = event.keyCode;

			if(keyPressed == 13) 
			{
				/*Enter pressed*/
				creatableFuncReplaceInputToSpan($(this));
			}
			if(keyPressed == 27) 
			{
				/*Escape pressed*/
				$(this).val($(this).attr("initValue"));
				creatableFuncReplaceInputToSpan($(this));
			}

		};

		$(tag).attr("initValue", $(this).text());
		$(tag).data("id", $(this).data("id"));
		$(tag).data("action", $(this).data("action"));
		$(tag).width($(this).width() + 30);

		$(this).replaceWith(tag);
		$(tag).on("keyup", keyupEventHandler);
		$(tag).removeClass("creatable_highlighted_class");

		if($(tag).data("action") == "AJAX_updateGroupLink") 
		{
			$(tag).on("blur", creatableFuncReplaceInputToSpan);
		}
		if($(tag).data("action") == "AJAX_updateGroupEmployeeNumber") 
		{
			$(tag).on("blur", creatableFuncReplaceInputToSpan);
		}
		if($(tag).data("action") == "AJAX_updateGroupFoundationDate") 
		{
			var tagValue = system_calls.ConvertMonthNameToNumber($(this).text());

			$(tag).val(tagValue);
			$(tag).on("change", UpdateGroupFoundationDatePickerOnChangeHandler);
			$(tag).datepicker({
				firstDay: 1,
				dayNames: [ "Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота" ],
				dayNamesMin: [ "Вc", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб" ],
				monthNames: [ "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь" ],
				monthNamesShort: [ "Янв", "Фев", "Мар", "Апр", "Май", "Июнь", "Июль", "Авг", "Сен", "Окт", "Ноя", "Дек" ],
				dateFormat: "dd/mm/yy",
				changeMonth: true,
				changeYear: true,
				yearRange: system_calls.GetTodaysYear() - 100 + ":" + system_calls.GetTodaysYear(),
				showOtherMonths: true
				// maxDate: system_calls.ConvertMonthNameToNumber($(tag).next().val()) || system_calls.ConvertMonthNameToNumber($(tag).next().text())
			});
		}

		$(tag).select();
	};

	var	creatableFuncReplaceInputToSpan = function (param) 
	{
		var currentTag = ((typeof param.html == "function") ? param : $(this));
		var	newTag = $("<span>", {
			text: $(currentTag).val().replace(/^\s+/, "").replace(/\s+$/, ""),
			id: $(currentTag).attr("id"),
			class: $(currentTag).attr("class")
		});

		$(newTag).data("id", $(currentTag).data("id"));
		$(newTag).data("action", $(currentTag).data("action"));

		if(($(currentTag).data("action") == "AJAX_updateGroupFoundationDate"))
		{
			// --- don't replace datepicker back to span
			// --- it expose bootstrap error, few ms after replacement
		}
		else
		{
			$(currentTag).replaceWith(newTag);
			$(newTag).on("click", creatableFuncReplaceSpanToInput);
			$(newTag).mouseenter(creatableFuncHighlightBgcolor);
			$(newTag).mouseleave(creatableFuncNormalizeBgcolor);
		}

		if(system_calls.ConvertTextToHTML($(currentTag).val()) == system_calls.ConvertTextToHTML($(currentTag).attr("initValue")))
		{
			// --- value hasn't been changed
			// --- no need to update server part
			console.error("creatableFuncReplaceInputToSpan: value hasn't been changed");
		}
		else
		{
			var		ajaxAction = $(newTag).data("action");
			var		ajaxActionID = $(newTag).data("id");
			var		ajaxValue = $(newTag).text();

			$.ajax({
				url:"/cgi-bin/group.cgi",
				data: {action:ajaxAction, id:ajaxActionID, value:system_calls.ConvertTextToHTML(ajaxValue), groupid: groupProfile.id}
			}).done(function(data)
				{
					try // --- catch JSON.parse
					{
						var ajaxResult = JSON.parse(data);

						if(ajaxResult.result == "success")
						{

							if(ajaxAction == "AJAX_updateGroupLink")
							{
								groupProfile.link = (ajaxValue.length ? ajaxValue : "(отсутствует)");
								$("#groupLink").empty().append(groupProfile.link);
							}
							else if(ajaxAction == "AJAX_updateGroupEmployeeNumber")
							{
								groupProfile.numberOfEmployee = (ajaxValue.length ? ajaxValue : "0");
								$("#groupNumberOfEmployee").empty().append(groupProfile.numberOfEmployee);
							}
						}
						else
						{
							console.error("creatableFuncReplaceInputToSpan: ERROR in ajax [action = " + ajaxAction + ", id = " + groupProfile.id + ", ajaxValue = " + ajaxValue + "] " + ajaxResult.description);

							if(ajaxAction == "AJAX_updateGroupLink")
							{
								system_calls.PopoverError("groupLink", ajaxResult.description);
								$("#groupLink").empty().append(ajaxResult.link);
							}
						}
					}
					catch(e)
					{
						console.error("creatableFuncReplaceInputToSpan:ERROR: can't parse JSON form server");
					}

				});
		}

		// --- Check if first/last name is empty. In that case change it to "Без хххх"
		// --- !!! Важно !!! Нельзя передвигать наверх. Иначе не произойдет обновления в БД
		if($("#firstName").text() === "") { $("#firstName").text("Без имени"); }
		if($("#lastName").text() === "") { $("#lastName").text("Без фамилии"); }
	};



	var	creatableFuncReplaceToParagraphRenderHTML = function (currentTag, content) {
		/*Escape pressed*/
		var currentID = currentTag.attr("id");
		var	newTag = $("<p>", {
			html: content,
			id: currentID,
			class: currentTag.attr("class")
		});

		Object.keys(currentTag.data()).forEach(function(item) { $(newTag).data(item, currentTag.data(item)); });

		currentTag.replaceWith(newTag);
		$("#" + currentID + "ButtonAccept").remove();
		$("#" + currentID + "ButtonReject").remove();
		$(newTag).on("click", creatableFuncReplaceParagraphToTextarea);
		$(newTag).mouseenter(creatableFuncHighlightBgcolor);
		$(newTag).mouseleave(creatableFuncNormalizeBgcolor);
	};

	var	creatableFuncReplaceToParagraphAccept = function (currentTag) {
		var currentContent = $(currentTag).val();

		if(system_calls.ConvertTextToHTML($(currentTag).val()) != system_calls.FilterUnsupportedUTF8Symbols($(currentTag).attr("initValue")))
		{
			// --- text has been changed

			if(currentTag.data("action") === "updateGroupDescription") 
			{
				var		filteredGroupDescription = system_calls.FilterUnsupportedUTF8Symbols(currentContent);

				if((filteredGroupDescription === "") || (filteredGroupDescription === "(описание отсутствует)")) 
				{
					filteredGroupDescription = "";	
				}

				if(filteredGroupDescription.length > 16384)
				{
					filteredGroupDescription = filteredGroupDescription.substr(0, 16384);
					console.error("creatableFuncReplaceToParagraphAccept:ERROR: description bigger than 16384 symbols");
				}

				groupProfile.description = filteredGroupDescription;

				$.post("/cgi-bin/group.cgi?rand=" + Math.floor(Math.random() * 1000000000), 
					{
						description: filteredGroupDescription,
						action: "AJAX_updateGroupDescription",
						groupid: groupProfile.id,
						rand: Math.floor(Math.random() * 1000000000)
					}).done(function(data) {
						var		resultJSON = JSON.parse(data);

						if(resultJSON.result === "success")
						{
							if(filteredGroupDescription === "")
							{
								$("#groupDescription").empty().append("(описание отсутствует)");
							}
						}
						else
						{
							console.error("creatableFuncReplaceToParagraphAccept: ERROR: " + resultJSON.description);
						}
					});
			} // --- if action == updateGroupDescription
		} // --- if textarea value changed
		else
		{
			console.error("creatableFuncReplaceToParagraphAccept: textarea value hasn't change");
		}

		creatableFuncReplaceToParagraphRenderHTML(currentTag, system_calls.ConvertTextToHTML(currentContent));

	};

	var	creatableFuncReplaceToParagraphReject = function (currentTag) {
		/*Escape pressed*/
		creatableFuncReplaceToParagraphRenderHTML(currentTag, currentTag.attr("initValue"));
	};

	var	creatableFuncReplaceParagraphToTextarea = function () 
	{
		var	ButtonAcceptHandler = function() {
			var		associatedTextareaID = $(this).data("associatedTagID");
			creatableFuncReplaceToParagraphAccept($("#" + associatedTextareaID));
		};

		var	ButtonRejectHandler = function() {
			var		associatedTextareaID = $(this).data("associatedTagID");
			creatableFuncReplaceToParagraphReject($("#" + associatedTextareaID));
		};

		var	currentTag = $(this);
		var	initContent = system_calls.PrebuiltInitValue(currentTag.html());
		var	tag = $("<textarea>", {
			val: system_calls.ConvertHTMLToText(initContent),
			type: "text",
			id: currentTag.attr("id"),
			class: currentTag.attr("class")
		});
		var tagButtonAccept = $("<button>", { 
			type: "button", 
			class: "btn btn-primary float_right margin_5",
			id: currentTag.attr("id") + "ButtonAccept",
			text: "Сохранить"
		}).data("action", "accept")
			.data("associatedTagID", currentTag.attr("id"))
			.on("click", ButtonAcceptHandler);
		var tagButtonReject = $("<button>", { 
			type: "button", 
			class: "btn btn-default float_right margin_5",
			id: currentTag.attr("id") + "ButtonReject",
			text: "Отменить"
		}).data("action", "reject")
			.data("associatedTagID", currentTag.attr("id"))
			.on("click", ButtonRejectHandler);

		var keyupEventHandler = function(event) {
			/* Act on the event */
			var	keyPressed = event.keyCode;

			if((event.ctrlKey && event.keyCode == 10) || (event.ctrlKey && event.keyCode == 13))
			{
				/*Ctrl+Enter pressed*/
				creatableFuncReplaceToParagraphAccept($(this));
			}
			if(keyPressed == 27) {
				/* Esc pressed */
				creatableFuncReplaceToParagraphReject($(this));
			}
		};

		$(tag).attr("initValue", initContent);
		$(tag).width(currentTag.width());
		$(tag).height((currentTag.height() + 30 < 100 ? 100 : currentTag.height() + 30));
		Object.keys(currentTag.data()).forEach(function(item) { 
			$(tag).data(item, currentTag.data(item)); 
		});

		currentTag.replaceWith(tag);
		$(tag).removeClass("creatable_highlighted_class");
		$(tag).after(tagButtonAccept);
		$(tag).after(tagButtonReject);
		$(tag).on("keyup", keyupEventHandler);
		$(tag).select();
	};


	var UpdateGroupFoundationDatePickerOnChangeHandler = function() {
		var		ajaxAction = $(this).data("action");
		var		ajaxActionID = $(this).data("id");
		var		ajaxValue = $(this).val();

		if(ajaxValue.length)
		{
			/* Act on the event */
			$.getJSON("/cgi-bin/group.cgi",
				{action:ajaxAction, id:ajaxActionID, value:ajaxValue, groupid:groupProfile.id})
				.done(function (data) 
				{
					if(data.result == "success")
					{
						groupProfile.foundationDate = ajaxValue;
					}
					else
					{
						console.error("UpdateGroupFoundationDatePickerOnChangeHandler: ERROR: " + data.description);
					}

				});
		}
		else
		{
			$("#groupFoundationDate").popover({"content": "Выберите дату основания компании"})
								.popover("show")
								.parent().removeClass("has-success")
										.addClass("has-feedback has-error");
			setTimeout(function () 
				{
					$("#groupFoundationDate").popover("destroy");
				}, 3000);
		}
	};

	var creatableFuncHighlightBgcolor = function () {
		$(this).addClass("creatable_highlighted_class", 400);
	};

	var creatableFuncNormalizeBgcolor = function () {
		$(this).removeClass("creatable_highlighted_class", 200, "easeInOutCirc");
	};

	return {
		Init: Init,
		groupProfile: groupProfile
	};

})();
