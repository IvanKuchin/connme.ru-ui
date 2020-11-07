var		view_group_profile = view_group_profile || {};

view_group_profile = (function()
{
	'use strict';

	var		groupProfile;
	var		myUserProfile;

	var		myUserID;
	var		groupID;
	var		groupLink;

	var	Init = function()
	{
		myUserID = $("#myUserID").data("myuserid");
		groupID = $("#groupName").data("groupid");
		groupLink = $("#groupName").data("grouplink");

		$("#news_feed").data("dsttype", "group");
		$("#news_feed").data("dstid", groupID);

		$("#AreYouSure #Remove").on("click", AreYouSureRemoveHandler);

		FillinGroupProfile();
	};

	var FillinGroupProfile = function()
	{
		$.getJSON('/cgi-bin/group.cgi?action=AJAX_getGroupProfileAndUser', {link: groupLink})
			.done(function(data) {
				if(data.result === "success")
				{
					if(data.groups.length)
					{
						groupProfile = data.groups[0];
						myUserProfile = data.users[0];

						DrawGroupLogo(groupProfile.logo_folder, groupProfile.logo_filename, groupProfile.title);

						RenderCommonInfo();
						RenderFollowButton();
						RenderSubscribersAvatars();

						if(system_calls.GetParamFromURL("scrollto").length) system_calls.ScrollWindowToElementID("#" + system_calls.GetParamFromURL("scrollto"));
					}
					else
					{
						$("#groupName").empty().append("Группа заблокирована");
						$("#SubmitMessage").addClass("hidden");
					}
				}
				else
				{
					console.debug("FillinGroupProfile: ERROR: " + data.description);
				}
			})
			.fail(function() {
				console.debug("FillinGroupProfile: error parsing JSON from server");
			});
	};

	var	DrawGroupLogo = function (groupImageFolder, groupImageFilename, groupName)
	{
		var		canvasCtx; 

		$("#canvasForAvatar").attr("width", "320")
							.attr("height", "320");
		canvasCtx = $("#canvasForAvatar")[0].getContext("2d");

		if(groupImageFilename.length)
			DrawCompanyAvatar(canvasCtx, "/images/groups/" + groupImageFolder + "/" + groupImageFilename, groupName, "");
		else
			DrawCompanyAvatar(canvasCtx, "", groupName, "");

	};

	var	RenderCommonInfo = function()
	{
		$("#groupName").append(groupProfile.title);
		$("#groupFoundationDate").append(system_calls.GetLocalizedDateNoTimeFromSeconds(groupProfile.eventTimestampCreation));
		$("#numberOfMembers").append(groupProfile.numberOfMembers);
		$("#groupDescription").append(groupProfile.description);
	};

	var	RenderSubscribersAvatars = function()
	{
		$("#subscribersAvatarList").append(system_calls.GetAvatarsList(groupProfile.subscribers));
		if(groupProfile.numberOfMembers > groupProfile.subscribers.length)
		{
			$("#subscribersAvatarList").append("...")
		}
	};

	var	amISubscribedToGroup = function(groupID)
	{
		var		result = false;

		if((typeof(myUserProfile) != "undefined") && (typeof(myUserProfile.subscriptions) != "undefined"))
		{
			myUserProfile.subscriptions.forEach(function(item)
			{
				if((item.entity_type == "group") && (item.entity_id == groupID))
					result = true;
			});
		}

		return result;
	};

	var	RenderFollowButton = function()
	{
		var		followButton = $("<button>").addClass("btn form-control")
											.attr("id", "SubscriptionButton")
											.data("script", "group.cgi")
											.attr("data-loading-text", "<span class='fa fa-refresh fa-spin fa-fw animateClass'></span> Ждите ...")
											.data("id", groupID)
											.on("click", GroupSubscriptionClickHandler);

		var		isSubscribed = amISubscribedToGroup(groupID) ? true : false;

		if(isSubscribed)
		{
			followButton.append("Отписаться")
						.addClass("btn-default")
						.data("action", "AJAX_UnsubscribeFromGroup");
		}
		else
		{
			followButton.append("Подписаться")
						.addClass("btn-primary")
						.data("action", "AJAX_SubscribeOnGroup");
		}

		$("#groupFollowButton").empty().append(followButton);
	};

	var	GroupSubscriptionClickHandler = function(e)
	{
		var		currTag = $(this);
		var		script = typeof(currTag.data("script")) == "string" ? currTag.data("script") : "group.cgi";
		var		action = typeof(currTag.data("action")) == "string" ? currTag.data("action") : "";

		if(action.length)
		{

			currTag.button("loading");

			$.getJSON('/cgi-bin/' + script + '?action=' + action, {id: currTag.data("id")})
				.done(function(data) 
				{
					if(data.result === "success")
					{
						myUserProfile.subscriptions = data.subscriptions;
						setTimeout(function() { RenderFollowButton(); }, 600);
					}
					else
					{
						system_calls.PopoverError("SubscriptionButton", data.description);
						console.debug("GroupSubscriptionClickHandler: ERROR: " + data.description);
					}

					setTimeout(function() {currTag.button("reset"); }, 500); // --- wait for animation
				})
				.fail(function() 
				{
					console.debug("GroupSubscriptionClickHandler: ERROR: parse JSON response from server");
					system_calls.PopoverError("SubscriptionButton", "Ошибка ответа сервера. Попробуйте через 24 часа.");
					setTimeout(function() {currTag.button("reset"); }, 500); // --- wait for animation
				});
		}
		else
		{
			console.debug("GroupSubscriptionClickHandler: ERROR: action doesn't defined");
		}

	};

	// --- additional modals
	var DisplaySpecifiedImageModal_Show = function()
	{
		var		currTag = $(this);
		var		type = currTag.data("type");
		var		id = currTag.data("id");
		var		src = currTag.attr("src");
		var		title = currTag.data("title");

		$("#ImageDisplayModal_Title").empty().append(title);
		$("#ImageDisplayModal_Img").attr("src", src);

		$("#ImageDisplayModal").modal("show");

	};

	var	AreYouSureRemoveHandler = function() {
		var		affectedID = $("#AreYouSure #Remove").data("id");
		var		affectedAction = $("#AreYouSure #Remove").data("action");

		$("#AreYouSure").modal('hide');

		$.getJSON('/cgi-bin/index.cgi?action=' + affectedAction, {id: affectedID})
			.done(function(data) {
				if(data.result === "success")
				{
				}
				else
				{
					console.debug("AreYouSureRemoveHandler: ERROR: " + data.description);
				}
			});

		// --- update GUI has to be inside getJSON->done->if(success).
		// --- To improve User Experience (react on user actions immediately) 
		// ---     I'm updating GUI immediately after click, not waiting server response
		if(affectedAction == "AJAX_removeRecommendationEntry")
		{
			groupProfile.recommendation.forEach(function(item, i, arr) {
				if(item.recommendationID == affectedID)
				{
					groupProfile.recommendation.splice(i, 1);
				}
			});
			RenderRecommendationPath();
		}
	};

	// --- Editable function
	var editableFuncHighlightBgcolor = function () {
		$(this).addClass("editable_highlighted_class", 400);
	};

	var editableFuncNormalizeBgcolor = function () {
		$(this).removeClass("editable_highlighted_class", 200, "easeInOutCirc");

	};

	var	editableFuncReplaceToParagraphAccept = function (currentTag) {
		var currentContent = $(currentTag).val();
		var	isClearToAdd = true;

		if(!currentContent.trim().length)
		{
			isClearToAdd = false;
			$(currentTag).popover({"content": "Рекомендация не может быть пустой."})
						.popover("show")
						.parent().removeClass("has-success")
						.addClass("has-feedback has-error");
			setTimeout(function () 
				{
					$(currentTag).popover("destroy");
				}, 3000);
		}
		else
		{
			$(currentTag).parent().removeClass("has-error").addClass("has-feedback has-success");
		}


		if(isClearToAdd)
		{
			if(system_calls.ConvertTextToHTML($(currentTag).val()) != system_calls.FilterUnsupportedUTF8Symbols($(currentTag).attr("initValue")))
			{
				// --- text has been changed

				if(currentTag.data("action") === "updateRecommendationTitle") 
				{
					if(currentContent === "") {	currentContent = "Опишите круг своих обязанностей работы в компании.";	}

					$.post('/cgi-bin/index.cgi?rand=' + Math.floor(Math.random() * 1000000000), 
						{
							id: $(currentTag).data("id"), content: system_calls.FilterUnsupportedUTF8Symbols($(currentTag).val()),
							action: "AJAX_updateRecommendationTitle",
							rand: Math.floor(Math.random() * 1000000000)
						}, "json")
						.done(function(data) {
							var		resultJSON = JSON.parse(data);
							if(resultJSON.result === "success")
							{

							}
							else
							{
								console.debug("editableFuncReplaceToParagraphAccept: ERROR: " + resultJSON.description);
							}
						});
				}

			}

			editableFuncReplaceToParagraphRenderHTML(currentTag, system_calls.ConvertTextToHTML(currentContent));
		}
	};

	var	editableFuncReplaceToParagraphReject = function (currentTag) {
		/*Escape pressed*/
		editableFuncReplaceToParagraphRenderHTML(currentTag, currentTag.attr("initValue"));
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
		$(newTag).on('click', editableFuncReplaceToTextarea);
		$(newTag).mouseenter(editableFuncHighlightBgcolor);
		$(newTag).mouseleave(editableFuncNormalizeBgcolor);
	};

	var	editableFuncReplaceToTextarea = function (e) {
		var	ButtonAcceptHandler = function() {
			var		associatedTextareaID = $(this).data("associatedTagID");
			editableFuncReplaceToParagraphAccept($("#" + associatedTextareaID));
		};

		var	ButtonRejectHandler = function(e) {
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
		$(tag).removeClass('editable_highlighted_class');
		$(tag).after(tagButtonAccept);
		$(tag).after(tagButtonReject);
		$(tag).on('keyup', keyupEventHandler);
		$(tag).select();
	};



	return {
			Init: Init,
		};
})(); // --- view_group_profile object

