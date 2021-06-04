
var	edit_group = edit_group || {};

edit_group = (function()
{
	"use strict";

	var		groupProfile = {};

	var	Init = function()
	{
		groupProfile.id = $("#groupInfo").data("id");

		$("#AreYouSure #Remove")	.on("click", AreYouSureRemoveHandler);
		$("#groupBlock")			.on("click", BlockButtonClickHandler);
		$("#canvasForGroupLogo")	.on("click", function() { $("#fileupload").click(); });
		$("#group_delete button")	.on("click", GroupDelete_ClickHandler);

		$.getJSON("/cgi-bin/group.cgi?action=AJAX_getGroupProfile", {id: groupProfile.id})
			.done(function(data) 
			{
				if((data.result === "success") && (data.groups.length))
				{
					if((data.groups[0].isMine == "1"))
					{
						groupProfile = data.groups[0];
						RenderGroupLogo();
						RenderGroupTitle();
						RenderBlockButton();
					}
					else
					{
						// $("#NotMyGroup .mailme").on("click", function(){ return CraftGroupChangeMail(data.groups[0]); });
						$("#NotMyGroup").modal("show");
					}
				}
				else
				{
					console.debug("Init: ERROR: " + data.description + " or groups length = 0");
				}
			});

		// --- Image uploader
		$(function () 
		{
			// Change this to the location of your server-side upload handler:
			$("#fileupload").fileupload({
				url: "/cgi-bin/grouplogouploader.cgi?uploadType=groupLogo",
				formData: {groupid:groupProfile.id},
				dataType: "json",
				maxFileSize: 30 * 1024 * 1024, 
				acceptFileTypes: /(\.|\/)(gif|jpe?g|png)$/i,


				done: function (e, data) {

					$.each(data.result, function(index, value) 
						{
							if(value.result == "error")
							{
								console.debug("fileupload: done handler: ERROR uploading file [" + value.fileName + "] error code [" + value.textStatus + "]");
								if(value.textStatus == "wrong format")
								{
									$("#UploadAvatarErrorBS_ImageName").text(value.fileName);
									$("#UploadAvatarErrorBS").modal("show");
								}
							}

							if(value.result == "success")
							{
								groupProfile.logo_folder = value.logo_folder;
								groupProfile.logo_filename = value.logo_filename;

								console.debug("fileupload: done handler: uploading success original file[" + value.fileName + "], destination file[folder:" + groupProfile.logo_folder + ", filename:" + groupProfile.logo_filename + "]");

								RenderGroupLogo();
							}
						});

				},
				progressall: function (e, data) {
					var progress = parseInt(data.loaded / data.total * 100, 10);
					$("#progress .progress-bar").css(
						"width",
						progress + "%"
					);
				},
				fail: function (e, data) {
					alert("ошибка загрузки фаила: " + data.textStatus);
				}

			}).prop("disabled", !$.support.fileInput)
				.parent().addClass($.support.fileInput ? undefined : "disabled");
		});

	};

	var	BlockButtonClickHandler = function()
	{
		var		currTag = $(this);

		$("#groupBlock").button("loading");

		if(currTag.data("action") == "AJAX_unblockGroup")
		{
			// --- pass
		}
		else if(currTag.data("action") == "AJAX_blockGroup")
		{
			// --- pass
		}

		$.getJSON("/cgi-bin/group.cgi?action=" + currTag.data("action"), {id: currTag.data("id"), rand: Math.random() * 1234567890})
			.done(function(data) {
				if(data.result === "success")
				{
					groupProfile = data.groups[0];
					window.setTimeout(function() { RenderBlockButton(); }, 600);
				}
				else
				{
					console.debug("BlockButtonClickHandler: ERROR: " + data.description);
				}

				window.setTimeout(function() { $("#groupBlock").button("reset"); }, 500);
			})
			.fail(function() {
				console.error("BlockButtonClickHandler:ERROR: parsing JSON response from server");

				window.setTimeout(function() { $("#groupBlock").button("reset"); }, 500);
			});

	};

	var	RenderBlockButton = function()
	{
		var		classToAdd, description, action;

		if(groupProfile.isBlocked == "Y")
		{
			classToAdd = "btn-danger";
			description = "Заблокирована";
			action = "AJAX_unblockGroup";
		}
		else
		{
			classToAdd = "btn-success";
			description = "Активна";
			action = "AJAX_blockGroup";
		}

		$("#groupBlock").removeClass("btn-danger btn-default")
						.addClass(classToAdd)
						.empty()
						.append(description)
						.data("action", action)
						.data("id", groupProfile.id);
	};

	var	RenderGroupTitle = function()
	{
		$("span#groupTitle").html(groupProfile.title);
		$("span#groupLink").html(groupProfile.link);
		$("span#groupFoundationDate").html(system_calls.GetLocalizedDateNoTimeFromSeconds(groupProfile.eventTimestampCreation));
		$("p#groupDescription").html(groupProfile.description ? groupProfile.description : "(описание отсутствует)");

		$("div#groupInfo .editableSpan").on("click", editableFuncReplaceSpanToInput);
		$("div#groupInfo .editableSpan").mouseenter(editableFuncHighlightBgcolor);
		$("div#groupInfo .editableSpan").mouseleave(editableFuncNormalizeBgcolor);

		$("div#groupInfo .editableParagraph").on("click", editableFuncReplaceParagraphToTextarea);
		$("div#groupInfo .editableParagraph").mouseenter(editableFuncHighlightBgcolor);
		$("div#groupInfo .editableParagraph").mouseleave(editableFuncNormalizeBgcolor);

		$("div#groupInfo .editableSelectGroupType").on("click", editableFuncReplaceSpanToSelectGroupType);
		$("div#groupInfo .editableSelectGroupType").mouseenter(editableFuncHighlightBgcolor);
		$("div#groupInfo .editableSelectGroupType").mouseleave(editableFuncNormalizeBgcolor);
	};


	var	AreYouSureRemoveHandler = function() {
		var		affectedID = $("#AreYouSure #Remove").data("id");
		var		affectedAction = $("#AreYouSure #Remove").data("action");
		var		affectedScript = $("#AreYouSure #Remove").data("script");

		if((typeof(affectedScript) == "undefined") || (affectedScript == ""))
			affectedScript = "group.cgi";

		$("#AreYouSure").modal("hide");

		$.getJSON("/cgi-bin/" + affectedScript + "?action=" + affectedAction, {id: affectedID, rand: Math.random() * 1234567890})
			.done(function(data) {
				if(data.result === "success")
				{
					// --- pass
				}
				else
				{
					console.debug("ERROR: " + data.description);
				}
			});

		// --- update GUI has to be inside getJSON->done->if(success).
		// --- To improve User Experience (react on user actions immediately, in spite to potential server error's) 
		if(affectedAction == "AJAX_deleteGroup")
		{
			window.location.replace("/groups_i_own_list?rand=" + Math.random()*98765432123456);
		}
	};

	var	editableFuncReplaceSpanToInput = function () 
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
				editableFuncReplaceInputToSpan($(this));
			}
			if(keyPressed == 27) 
			{
				/*Escape pressed*/
				$(this).val($(this).attr("initValue"));
				editableFuncReplaceInputToSpan($(this));
			}

		};

		$(tag).attr("initValue", $(this).text());
		$(tag).data("id", $(this).data("id"));
		$(tag).data("action", $(this).data("action"));
		$(tag).width($(this).width() + 30);

		$(this).replaceWith(tag);
		$(tag).on("keyup", keyupEventHandler);
		$(tag).removeClass("editable_highlighted_class");

		if($(tag).data("action") == "AJAX_updateGroupLink") 
		{
			$(tag).on("blur", editableFuncReplaceInputToSpan);
		}
		if($(tag).data("action") == "AJAX_updateGroupEmployeeNumber") 
		{
			$(tag).on("blur", editableFuncReplaceInputToSpan);
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

	var	editableFuncReplaceInputToSpan = function (param) 
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
			$(newTag).on("click", editableFuncReplaceSpanToInput);
			$(newTag).mouseenter(editableFuncHighlightBgcolor);
			$(newTag).mouseleave(editableFuncNormalizeBgcolor);
		}

		if(system_calls.ConvertTextToHTML($(currentTag).val()) == system_calls.ConvertTextToHTML($(currentTag).attr("initValue")))
		{
			// --- value hasn't been changed
			// --- no need to update server part
			console.debug("editableFuncReplaceInputToSpan: value hasn't been changed");
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
							console.debug("editableFuncReplaceInputToSpan: ERROR in ajax [action = " + ajaxAction + ", id = " + groupProfile.id + ", ajaxValue = " + ajaxValue + "] " + ajaxResult.description);

							if(ajaxAction == "AJAX_updateGroupLink")
							{
								system_calls.PopoverError("groupLink", ajaxResult.description);
								$("#groupLink").empty().append(ajaxResult.link);
							}
						}
					}
					catch(e)
					{
						console.debug("editableFuncReplaceInputToSpan:ERROR: can't parse JSON form server");
					}

				});
		}

		// --- Check if first/last name is empty. In that case change it to "Без хххх"
		// --- !!! Важно !!! Нельзя передвигать наверх. Иначе не произойдет обновления в БД
		if($("#firstName").text() === "") { $("#firstName").text("Без имени"); }
		if($("#lastName").text() === "") { $("#lastName").text("Без фамилии"); }
	};



	var	editableFuncReplaceToParagraphRenderHTML = function (currentTag, content) {
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
		$(newTag).on("click", editableFuncReplaceParagraphToTextarea);
		$(newTag).mouseenter(editableFuncHighlightBgcolor);
		$(newTag).mouseleave(editableFuncNormalizeBgcolor);
	};

	var	editableFuncReplaceToParagraphAccept = function (currentTag) {
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
					console.debug("editableFuncReplaceToParagraphAccept:ERROR: description bigger than 16384 symbols");
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
							if(filteredGroupDescription == "")
							{
								$("#groupDescription").empty().append("(описание отсутствует)");
							}
						}
						else
						{
							console.debug("editableFuncReplaceToParagraphAccept: ERROR: " + resultJSON.description);
						}
					});
			} // --- if action == updateGroupDescription
		} // --- if textarea value changed
		else
		{
			console.debug("editableFuncReplaceToParagraphAccept: textarea value hasn't change");
		}

		editableFuncReplaceToParagraphRenderHTML(currentTag, system_calls.ConvertTextToHTML(currentContent));

	};

	var	editableFuncReplaceToParagraphReject = function (currentTag) {
		/*Escape pressed*/
		editableFuncReplaceToParagraphRenderHTML(currentTag, currentTag.attr("initValue"));
	};

	var	editableFuncReplaceParagraphToTextarea = function () 
	{
		var	ButtonAcceptHandler = function() {
			var		associatedTextareaID = $(this).data("associatedTagID");
			editableFuncReplaceToParagraphAccept($("#" + associatedTextareaID));
		};

		var	ButtonRejectHandler = function() {
			var		associatedTextareaID = $(this).data("associatedTagID");
			editableFuncReplaceToParagraphReject($("#" + associatedTextareaID));
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
				editableFuncReplaceToParagraphAccept($(this));
			}
			if(keyPressed == 27) {
				/* Esc pressed */
				editableFuncReplaceToParagraphReject($(this));
			}
		};

		$(tag).attr("initValue", initContent);
		$(tag).width(currentTag.width());
		$(tag).height((currentTag.height() + 30 < 100 ? 100 : currentTag.height() + 30));
		Object.keys(currentTag.data()).forEach(function(item) { 
			$(tag).data(item, currentTag.data(item)); 
		});

		currentTag.replaceWith(tag);
		$(tag).removeClass("editable_highlighted_class");
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
						console.debug("UpdateGroupFoundationDatePickerOnChangeHandler: ERROR: " + data.description);
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

	var	editableFuncReplaceSpanToSelectGroupType = function () 
	{
		var	currentValue = $(this).text();
		var	tag = $("<select>", {
			id: $(this).attr("id"),
			class: $(this).attr("class")
		});

		system_calls.groupTypes.forEach(function(item)
		{
			$(tag).append($("<option>").append(item));
		});

		$(tag).val(currentValue); 

		var	selectChangeHandler = function() 
		{
			editableFuncReplaceSelectToSpan($(this), editableFuncReplaceSpanToSelectGroupType);
		};

		var keyupEventHandler = function(event) 
		{
			/* Act on the event */
			var	keyPressed = event.keyCode;

			if(keyPressed == 13) {
				/*Enter pressed*/
				selectChangeHandler();
			}
			if(keyPressed == 27) {
				/*Escape pressed*/
				$(this).val($(this).attr("initValue"));
				editableFuncReplaceSelectToSpan($(this), editableFuncReplaceSpanToSelectGroupType);
			}
		};

		$(tag).attr("initValue", $(this).text());
		$(tag).data("id", $(this).attr("id"));
		$(tag).data("action", $(this).data("action"));
		$(tag).width($(this).width()*2);

		$(this).replaceWith(tag);
		$(tag).on("keyup", keyupEventHandler);
		$(tag).on("change", selectChangeHandler);
		$(tag).on("blur", selectChangeHandler);
		$(tag).removeClass("editable_highlighted_class");

		if($(tag).data("action") == "XXXXXXXXXX") 
		{
			// --- pass
		}
	};

	// --- Replacement Select to Span
	// --- input: 1) tag
	// ---		2) function to call to convert Span->Select
	var	editableFuncReplaceSelectToSpan = function (param, funcFromSelectToSpan) 
	{
		var		ajaxAction;
		var		ajaxActionID;
		var		ajaxValue;

		var 	currentTag = ((typeof param.html == "function") ? param : $(this));
		var		initValue = $(currentTag).attr("initValue").replace(/^\s+/, "").replace(/\s+$/, "");

		var	newTag = $("<span>", {
			text: $(currentTag).val().replace(/^\s+/, "").replace(/\s+$/, ""),
			id: $(currentTag).attr("id"),
			class: $(currentTag).attr("class")
		});

		$(newTag).data("id", $(currentTag).data("id"));
		$(newTag).data("action", $(currentTag).data("action"));

		$(currentTag).replaceWith(newTag);
		$(newTag).on("click", funcFromSelectToSpan);
		$(newTag).mouseenter(editableFuncHighlightBgcolor);
		$(newTag).mouseleave(editableFuncNormalizeBgcolor);

		ajaxAction = $(newTag).data("action");
		ajaxActionID = $(newTag).data("id");
		ajaxValue = $(newTag).text();

		if(ajaxValue == initValue)
		{
			console.debug("editableFuncReplaceSelectToSpan: value hasn't been changed");
		}
		else
		{
			$.ajax({
					url:"/cgi-bin/group.cgi",
					data: {action:ajaxAction, id:ajaxActionID, value:system_calls.ConvertTextToHTML(ajaxValue), groupid: groupProfile.id}
				}).done(function(data)
				{
					var		ajaxResult = JSON.parse(data);
					if(ajaxResult.result == "success")
					{
						if(ajaxAction == "AJAX_updateGroupType")
						{
							groupProfile.type = ajaxValue;
						}
					}
					else
					{
						console.debug("editableFuncReplaceSelectToSpan: ERROR in ajax [action = " + ajaxAction + ", id = " + ajaxActionID + ", ajaxValue = " + ajaxValue + "] " + ajaxResult.description);
					}

				});
		} // --- if currValue == initValue
	}; // --- function

	var GroupDelete_ClickHandler = function()
	{
		$("#AreYouSure").modal("show");
		$("#AreYouSure #Remove").data("id", groupProfile.id);
		$("#AreYouSure #Remove").data("action", "AJAX_deleteGroup");
		$("#AreYouSure #Remove").data("script", "group.cgi");
	};

	var RenderGroupLogo = function()
	{
		var		tagCanvas = $("#canvasForGroupLogo");
		var		logoPath;

		if(groupProfile.logo_filename.length) logoPath = "/images/groups/" + groupProfile.logo_folder + "/" + groupProfile.logo_filename;
		else logoPath = "/images/pages/edit_group/nologo" + (Math.floor(Math.random()*8) + 1) + ".png";


		system_calls.RenderCompanyLogo(tagCanvas[0].getContext("2d"), logoPath, groupProfile.title, " ");
	};

	var editableFuncHighlightBgcolor = function () {
		$(this).addClass("editable_highlighted_class", 400);
	};

	var editableFuncNormalizeBgcolor = function () {
		$(this).removeClass("editable_highlighted_class", 200, "easeInOutCirc");
	};

	return {
		Init: Init,
		groupProfile: groupProfile
	};

})();
