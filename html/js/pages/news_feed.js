/*global PreviewImageControl*/
/*global carousel_tools*/
/*global NoSleep*/
/*exported news_feed*/

var news_feed = (function()
{
	"use strict";

	var	myCompanies = [];
	var	globalPageCounter = 0;  // --- used to keep track of page number if scrolling
	var	globalPostMessageImageList = []; // --- storage of previewImage objects in NewMessageModal
	var	imageTempSet;
	var globalNewsFeed;
	var scrollLock = false; // --- controls consecutive pagination
	var	globalUploadImageCounter, globalUploadImageTotal, globalUploadImage_UnloadedList;
	var	myProfile = {};
	var	globalMyCompanies = [];
	var	modalScrollPosition; // --- Modal issues on IOS (see end of Init)
	var	NoSleep_global;
	const uploadFileRegexImageVideo_global = /(\.|\/)(gif|jpe?g|png|mov|avi|mp4|webm)$/i;

	var Init = function() 
	{

		myProfile.id = $("#myUserID").data("myuserid");
		myProfile.firstName = $("#myFirstName").text();
		myProfile.lastName = $("#myLastName").text();

		// --- avoid caching in XHR
		$.ajaxSetup({ cache: false });

		if(session_pi.isCookieAndLocalStorageValid())
		{

			ZeroizeThenUpdateNewsFeedThenScrollTo(system_calls.GetParamFromURL("scrollto").length ? "#" + system_calls.GetParamFromURL("scrollto") : "");

			// --- "New message" events
			// --- News feed post message
			$("#NewsFeedMessageSubmit").on("click", NewsFeedPostMessage_ClickHandler);
			// --- News feed: New message: Link: GetData button
			$("#newsFeed_NewMessageLink_GetDataButton").on("click", GetDataFromProvidedURL);
			// --- Post message modal window show handler
			$("#NewsFeedNewMessage").on("show.bs.modal", NewMessageNewsFeedModal_ShownHandler);
			// --- Post message modal window hide handler
			$("#NewsFeedNewMessage").on("hidden.bs.modal", MessageModal_HiddenHandler);

			// --- enable/disable button on input to the link field
			$("#newsFeedMessageLink").on("input" , function () {
				var		content = $(this).val();
				if(content.length) $("#newsFeed_NewMessageLink_GetDataButton").removeAttr("disabled");
				else $("#newsFeed_NewMessageLink_GetDataButton").attr("disabled", "");
			});

			// --- messageAccessRights: 
			// --- 		hide if posted from company/group, 
			// --- 		unhide if posted from person
			$("#NewsFeedNewMessage .__message_src").on("change", function() {
				var	selectedValue = $("#srcEntity").val();

				if(selectedValue == myProfile.firstName + " " + myProfile.lastName)
				{
					$(".AccessRightButtons").toggle(300);
				}
				else
				{
					$(".AccessRightButtons").toggle(300);
					$("input#newsFeedAccessRights[value='public']").prop("checked", true);
				}

			});

			// --- "Edit message" events
			// --- News feed post message
			$("#editNewsFeedMessageSubmit").on("click", EditNewsFeedPostMessage);
			// --- Post message modal window show handler
			$("#editNewsFeedMessage").on("show.bs.modal", EditNewsFeedModal_ShownHandler);
			// --- Post message modal window hide handler
			$("#editNewsFeedMessage").on("hidden.bs.modal", MessageModal_HiddenHandler);

			// --- New message image uploader
			$(function () {
				// Change this to the location of your server-side upload handler:
				$("#newMessageFileUpload").fileupload({
					url: "/cgi-bin/imageuploader.cgi",
					dataType: "json",
					maxFileSize: 300 * 1024 * 1024,
					// acceptFileTypes: /(\.|\/)(gif|jpe?g|png)$/i,
					acceptFileTypes: uploadFileRegexImageVideo_global,
					singleFileUploads: true,
					disableImageResize: false,
					imageMaxWidth: 1024,
					imageMaxHeight: 768,

					always:			BlueimpImageUploader_Always,
					done: 			BlueimpImageUploader_Done,
					add:			BlueimpImageUploader_Add,
					progressall:	BlueimpImageUploader_Progressall,
					fail: 			BlueimpImageUploader_Fail
				})
					.on("fileuploadprocessalways", function (e, data) {
						if(
							(typeof(data.files.error) !=  "undefined") && data.files.error &&
							(typeof(data.files[0].error) !=  "undefined") && (data.files[0].error == "File is too large")
						)
						{
							system_calls.AlertError("newsFeedNewMessageError", "Фаил слишком большой");
						}

						if(data.files.error)
						{
							console.error("fileuploader:fileuploadprocessalways:ERROR: submit to upload (" + data.files[0].error + ")");//error message
							return false;
						} 
						
						console.log("fileuploader:fileuploadprocessalways: submit to upload", data.files[0].name);//error message
						return true;
					})
					.prop("disabled", !$.support.fileInput)
					.parent().addClass($.support.fileInput ? undefined : "disabled");
			});


			// --- Edit image uploader
			$(function () {
				// Change this to the location of your server-side upload handler:
				$("#editFileupload").fileupload({
					url: "/cgi-bin/imageuploader.cgi",
					dataType: "json",
					maxFileSize: 100 * 1024 * 1024, 
					// acceptFileTypes: /(\.|\/)(gif|jpe?g|png)$/i,
					acceptFileTypes: uploadFileRegexImageVideo_global,
					singleFileUploads: true,
					disableImageResize: false,
					imageMaxWidth: 1024,
					imageMaxHeight: 768,


					always:			BlueimpImageUploader_Always,
					done:			BlueimpImageUploader_Done,
					add:			BlueimpImageUploader_Add,
					progressall:	BlueimpImageUploader_Progressall,
					fail:			BlueimpImageUploader_Fail
				})
					.on("fileuploadprocessalways", function (e, data) {
						if(
							(typeof(data.files.error) !=  "undefined") && data.files.error &&
							(typeof(data.files[0].error) !=  "undefined") && (data.files[0].error == "File is too large")
						)
						{
							system_calls.AlertError("newsFeedEditMessageError", "Фаил слишком большой");
						}

						if(data.files.error)
						{
							console.error("fileuploader:fileuploadprocessalways:ERROR: submit to upload (" + data.files[0].error + ")");//error message
							return false;
						} 
						
						console.log("fileuploader:fileuploadprocessalways: submit to upload", data.files[0].name);//error message
						return true;
					})
					.prop("disabled", !$.support.fileInput)
					.parent().addClass($.support.fileInput ? undefined : "disabled");
			});

			// --- paste picture
			$("#NewsFeedNewMessage")	.on("paste", AddImageClipBufferImage_PasteHandler);
			$("#editNewsFeedMessage")	.on("paste", AddImageClipBufferImage_PasteHandler);

			// --- Is it require to update username ?
			if($("#myUserID").data("myuserid") && $("#myUserID").attr("data-mylogin") && $("#myUserID").attr("data-mylogin").length && ($("#myUserID").attr("data-mylogin") != "Guest"))
			{
				if(isUsernameExist() === true)
				{
					if(isUserAvatarExist() === true)
					{
						// --- good2go
					}
				}
			}

			// --- DeleteMessage button click handler
			$("#deleteMessageFromFeedSubmit").on("click", function ()
			{
				$("#DeleteMessageFromFeed").modal("hide");
				DeleteMessage($(this).data("messageID"));
			});

			// --- DeleteMessageComment button click handler
			$("#deleteCommentFromFeedSubmit").on("click", function ()
			{
				$("#DeleteCommentFromFeed").modal("hide");
				$("#viewNewsFeedMessage").modal("hide");
				DeleteMessageComment($(this).data("commentID"));
			});

			// --- Update avatar modal click handler
			$("#usernameUpdateAvatarSubmit").on("click", function ()
			{
				$("#UsernameUpdateAvatar").modal("hide");
				window.location = "/edit_profile";
			});

			// --- UserName update modal
			$("#userNameUpdateSubmit").on("click", function() 
			{
				$("#UsernameCredentials").modal("hide");
				UsernameUpdate();
			});

			// --- Write comment
			$("#buttonNewsFeedViewMessageComment").on("click", function ()
			{
				WriteCommentButtonHandler();
			});

			// --- write comment hidden.bs handler	
			$("#viewNewsFeedMessage").on("hidden.bs.modal", function ()
			{
				$("#buttonNewsFeedViewMessageComment").button("reset");
			});
			$("#viewNewsFeedMessage").on("hidden.bs.modal", function ()
			{
				$("#divNewsFeedMessageBody").empty();
				$("#divNewsFeedMessageComments").empty();
				$("#spanNewsFeedViewMessageUsername").empty();
				$("#spanNewsFeedViewMessageTimestamp").empty();
				$("#buttonNewsFeedViewMessageComment").removeData()
													.data("loadingText", "<span class='fa fa-refresh fa-spin fa-fw animateClass'></span> Загрузка...");
			});

			/*
			Workaround to overcome issues in modal dialog on IOS devices
			  1) cursor positioning (https://stackoverflow.com/questions/46339063/ios-11-safari-bootstrap-modal-text-area-outside-of-cursor/46866149#46866149)
			  2) background scroll (https://stackoverflow.com/questions/19060301/how-to-prevent-background-scrolling-when-bootstrap-3-modal-open-on-mobile-browse)
			*/
			if(isMobile.apple.device)
			{
				$("body").addClass("iOS-device");

				$(".modal").on("show.bs.modal", function() {
						modalScrollPosition = $(window).scrollTop();
					});
				$(".modal").on("hidden.bs.modal", function() {
						$(".iOS-device").css("top", 0);
						$(window).scrollTop(modalScrollPosition);	
					});
			}

			NoSleep_global = new NoSleep();

			// --- scroll handler
			$(window).on("scroll resize lookup", HandlerScrollToShow);

		}
		else
		{
			window.location.href = "/autologin?rand=" + Math.random() * 1234567890;
		}

	};

	var BlueimpImageUploader_Always = function (e, data)
	{
		var	modal_tag			= $(e.target).closest(".modal");
		var	media_preview_area	= modal_tag.find(".__media_preview_area");
		var media_preview		= $("<div>").appendTo(media_preview_area);

		console.debug("imageuploader: always handler: start");
		media_preview.addClass("container-fluid");

		data.files.forEach(
			function(item, i)
			{
				var		rowPreview = $("<div>").appendTo(media_preview)
													.addClass("row");

				console.debug("imageuploader: always handler: filename [" + item.name + "]");

				--globalUploadImageCounter;
				modal_tag.find("__submit").text("Загрузка (" + (globalUploadImageTotal - globalUploadImageCounter) + " из " + globalUploadImageTotal + ") ...");

				// TODO: 2delete: debug function to check upload functionality
				globalUploadImage_UnloadedList = jQuery.grep(globalUploadImage_UnloadedList, function(itemList) { return itemList != item.name; } );
				Update_PostMessage_ListUnloaded(globalUploadImage_UnloadedList);


				console.debug("imageuploader: always handler: number of uploading images is " + globalUploadImageCounter);
				if(!globalUploadImageCounter)
				{
					// modal_tag.find("__submit").button('reset');
					modal_tag.find("__submit").text("Написать");
				}

				// --- reset progress bar
				modal_tag.find(".progress-bar")		.removeClass("active")
													.css("width", "0%");
				modal_tag.find(".progress-string")	.empty();


				if(typeof(data.result) != "undefined")
				{							
					if(data.result[i].result == "success")
					{							
						rowPreview.addClass(" alert alert-success");
						$("<div>").addClass("col-lg-2 col-md-3 col-sm-3 col-xs-5").appendTo(rowPreview).append(typeof(item.preview) != "undefined" ? item.preview : "");
						$("<div>").addClass("col-lg-9 col-md-8 col-sm-8 col-xs-6").appendTo(rowPreview).append(item.name);

						globalPostMessageImageList.push(data.result[i]);
					}
					else
					{
						rowPreview.addClass(" alert alert-danger");
						$("<div>").addClass("col-lg-2 col-md-3 col-sm-3 col-xs-5").appendTo(rowPreview);
						$("<div>").addClass("col-lg-9 col-md-8 col-sm-8 col-xs-6").appendTo(rowPreview).append(data.result[0].fileName + " " + data.result[0].textStatus);
					}
				}
				else
				{
					console.error("imageuploader:ERROR in image upload (most probably image format is not supported)");							
					rowPreview.addClass(" alert alert-danger");
					$("<div>").addClass("col-lg-2 col-md-3 col-sm-3 col-xs-5").appendTo(rowPreview);
					$("<div>").addClass("col-lg-9 col-md-8 col-sm-8 col-xs-6").appendTo(rowPreview).append("ошибка: " + item.name);
				}
			}
		);

		modal_tag.find(".__submit").button("reset");
	};

	var	BlueimpImageUploader_Done = function (e, data) 
	{
		var	value = data.result;
			{
				if(value[0].result == "error")
				{
					console.error("imageuploader: done handler:ERROR uploading file [" + value.fileName + "] error code [" + value.textStatus + "]");
				}

				if(value[0].result == "success")
				{
					console.debug("imageuploader: done handler: uploading success [" + value[0].fileName + "]");
					// DrawAllAvatars();
				}
			}

	};

	var	 BlueimpImageUploader_Add = function (e, data) 
	{
		// --- original part of "add" handler 
		// --- !!! ATTENTION !!! do not change it
		var $this = $(this);
		var originalAdd = $.blueimp.fileupload.prototype.options.add;

		data.process(function () {
			return $this.fileupload("process", data);
		});
		originalAdd.call(this, e, data);

		// --- custom part of "add" handler
		var	modal_tag			= $(e.target).closest(".modal");

		modal_tag.find(".__submit").button("loading");

		data.files.forEach(
			function(item, i)
			{ 
				console.debug("imageuploader: add handler: filename " + i + " is " + item.name); 
				if(uploadFileRegexImageVideo_global.test(item.name))
				{
					++globalUploadImageCounter;
					globalUploadImageTotal = globalUploadImageCounter;
					// TODO: 2delete:  debug function to check upload functionality
					globalUploadImage_UnloadedList.push(item.name);
					Update_PostMessage_ListUnloaded(globalUploadImage_UnloadedList);
				}
			});
		if(globalUploadImageCounter)
		{
			modal_tag.find("__submit").text("Загрузка (0 из " + globalUploadImageCounter + ") ...");
		}

		console.debug("imageuploader: add handler: number of uploading images is " + globalUploadImageCounter);
	};

	var	 BlueimpImageUploader_Progressall = function (e, data) 
	{
		var	modal_tag			= $(e.target).closest(".modal");
		var progress = parseInt(data.loaded / data.total * 100, 10);

		modal_tag.find(".progress-bar").css("width", progress + "%");
		if(progress > 97) 
		{
			modal_tag.find(".progress-bar")		.addClass("active");
			modal_tag.find(".progress-string")	.empty().append("Обработка...");
		}
		else
		{
			modal_tag.find(".progress-string")	.empty().append(progress + "%");
		}
	};

	var	BlueimpImageUploader_Fail = function (e, data) 
	{
		console.error("newimageuploader: fail handler:ERROR image uploading [" + data.textStatus + "]");
	};

	// --- initialize all fields in "edit form"
	var EditNewsFeedModal_ShownHandler = function(e)
	{
		var 	modal_tag = $(e.target);

		var		editMessageID = modal_tag.find(".__submit").data("messageID");

		// --- globalUploadImageCounter used for disabling "Post" button during uploading images
		globalUploadImageCounter = 0;
		globalUploadImageTotal = 0;

		// TODO: 2delete: debug function to check upload functionality
		globalUploadImage_UnloadedList = [];
		Update_PostMessage_ListUnloaded(globalUploadImage_UnloadedList);

		modal_tag.find(".__submit").text("Редактировать");

		// --- clean-up preview pictures in PostMessage modal window 
		modal_tag.find(".__media_preview_area").empty();
		globalPostMessageImageList = [];

		// --- set progress bar to 0 length
		modal_tag.find(".__progress").find(".progress-bar").css("width", "0%");

		// --- set var imageTempSet to random
		imageTempSet = Math.floor(Math.random()*99999999);
		modal_tag.find(".__file_upload").fileupload({formData: {imageTempSet: imageTempSet, messageID: modal_tag.find(".__submit").data("messageID")}});

		globalNewsFeed.forEach(function(item)
			{
				if(typeof(item.messageId) != "undefined")
				{
					if(editMessageID == item.messageId)
					{
						var		messageMessage		= item.messageMessage;
						var		src_type			= item.srcObj.type; 
						var		dst_type			= item.dstObj.type || ""; 
						console.debug(src_type, " -> ", dst_type);
						var 	containerPreview	= $("<div>")
																.addClass("container-fluid")
																.append(RenderMessageMedia(item));


						// --- init all fields
						modal_tag.find(".__title")	.val(system_calls.ConvertHTMLToText(item.messageTitle));
						modal_tag.find(".__link")	.val(item.messageLink);
						modal_tag.find(".__text")	.val(system_calls.ConvertHTMLToText(messageMessage));

						// --- access right block
						modal_tag.find(".__access_rights").find("[value=\"" + item.messageAccessRights + "\"]").prop("checked", true);
						if((src_type === "user") && (dst_type === ""))
						{
							modal_tag.find(".__access_rights").show(300);
						}
						else
						{
							modal_tag.find(".__access_rights").hide(300);
						}

						// --- media preview block
						modal_tag.find(".__media_preview_area").append(containerPreview);

						// --- message destination block
						RenderSelectBoxWithUserAndGroups(myProfile, modal_tag.find(".__message_dst"), item);
						if(src_type  == "user")
						{
							// --- this block will be triggered if message written to 
							// --- a) personal feed  (src:user -> dst:)
							// --- b) group feed     (src:user -> dst:group)
							// --- then allow to change destination
							modal_tag.find(".__message_dst").show(300);
						}
						else
						{
							modal_tag.find(".__message_dst").hide(300);
						}
					}
				}
			});

		// --- zeroize tempSet for user at image_news table
		$.getJSON("/cgi-bin/index.cgi?action=AJAX_prepareEditFeedImages", {messageID: editMessageID, imageTempSet: imageTempSet})
				.done(function() 
				{
					// --- good2go
				})
				.fail(function() 
				{
					console.debug("fail() returned from edit message preparation");
				});

		// --- activate noSleep feature to avoid screen dimming during upload
		if(isMobile.phone) NoSleep_global.enable();
	};


	var	AddImageClipBufferImage_PasteHandler = function(event)
	{
		var	curr_tag	= $(event.target);
		var	modal_tag	= curr_tag.closest(".modal");
		var	uploader	= modal_tag.find(".__file_upload");
		var items		= (event.clipboardData || event.originalEvent.clipboardData).items;
		console.log("PasteHandler:" + JSON.stringify(items)); // will give you the mime types

		for (var idx in items) 
		{
			var item = items[idx];

			if (item.kind === "file") 
			{
				var blob = item.getAsFile();

				uploader.fileupload("add", {files: blob});
			}
		}
	};

	var	RenderMessageMedia = function(message)
	{
		var	result = $();

	/*
		message.messageImageList.sort(function(a, b)
			{
				var		orderA = parseInt(a.order);
				var		orderB = parseInt(b.order);
				var		result;

				if(orderA > orderB) { result = 1; }
				if(orderA == orderB) { result = 0; }
				if(orderA < orderB) { result = -1; }

				return result;
			});

	*/
		message.messageImageList.forEach(
			function(item, i)
			{
				// --- video could be encoded in two formats (webm and mp4), but having the same content
				// --- video must be displayed as the only file
				// --- all images must be shown
				if (
					(i === 0) ||
					((typeof(item.mediaType) != "undefined") && (item.mediaType == "image"))
				)
				{

					var		rowPreview = $("<div>")
													.addClass("row")
													.attr("id", "rowPreviewImageID" + item.id);
					var		spanRemove = $("<span>").addClass("glyphicon glyphicon-remove color_red cursor_pointer float_right")
													.on("click", EditNewsFeedModalRemoveImage)
													.attr("data-imageid", item.id)
													.attr("data-action", "AJAX_newsFeedMarkImageToRemove");
					var		mediaPreview;
					var		mediaTitle;

					if(item.mediaType == "image")
					{


						var	header 					= $("<span>")
														.on("click", AllWayUp_ClickHandler)
														.addClass("cursor_pointer fa-lg fa-stack")
														.attr("aria-hidden", "true")
														.attr("data-toggle", "tooltip")
														.attr("data-placement", "top")
														.attr("data-title", "наверх")
														.tooltip()
														.append("<i class=\"fa fa-inverse fa-circle fa-stack-2x\" aria-hidden=\"true\"> </i><i class=\"fa fa-angle-double-up fa-stack-1x\" aria-hidden=\"true\"> </i>");
						var	up						= $("<span>")
														.on("click", OneStepUp_ClickHandler)
														.addClass("cursor_pointer fa-lg fa-stack")
														.attr("aria-hidden", "true")
														.attr("data-toggle", "tooltip")
														.attr("data-placement", "top")
														.attr("data-title", "выше")
														.tooltip()
														.append("<i class=\"fa fa-inverse fa-circle fa-stack-2x\" aria-hidden=\"true\"> </i><i class=\"fa fa-angle-up fa-stack-1x\" aria-hidden=\"true\"> </i>");
						var	down					= $("<span>")
														.on("click", OneStepDown_ClickHandler)
														.addClass("cursor_pointer fa-lg fa-stack")
														.attr("aria-hidden", "true")
														.attr("data-toggle", "tooltip")
														.attr("data-placement", "top")
														.attr("data-title", "ниже")
														.tooltip()
														.append("<i class=\"fa fa-inverse fa-circle fa-stack-2x\" aria-hidden=\"true\"> </i><i class=\"fa fa-angle-down fa-stack-1x\" aria-hidden=\"true\"> </i>");
						var	footer					= $("<span>")
														.on("click", AllWayDown_ClickHandler)
														.addClass("cursor_pointer fa-lg fa-stack")
														.attr("aria-hidden", "true")
														.attr("data-toggle", "tooltip")
														.attr("data-placement", "top")
														.attr("data-title", "вниз")
														.tooltip()
														.append("<i class=\"fa fa-inverse fa-circle fa-stack-2x\" aria-hidden=\"true\"> </i><i class=\"fa fa-angle-double-down fa-stack-1x\" aria-hidden=\"true\"> </i>");

						var	preview_image_control	= new PreviewImageControl();

						mediaPreview = $("<img/>").attr("src", "/images/feed/" + item.folder + "/" + item.filename)
												.addClass("news_feed_edit_message_preview animateClass ");

						preview_image_control.Init(mediaPreview);

						mediaTitle = $("<span>")
												.append(header)
												/*.append("&nbsp;")*/
												/*.append("&nbsp;")*/
												.append(up)
												/*.append("&nbsp;")*/
												/*.append("&nbsp;")*/
												.append(down)
												/*.append("&nbsp;")*/
												/*.append("&nbsp;")*/
												.append(footer)
												/*.append("&nbsp;")*/
												/*.append("&nbsp;")*/
												.append(preview_image_control.Buttons_GetDOM())
												;
					}
					if(item.mediaType == "video")
					{
						mediaPreview = $("<video/>").attr("src", "/video/feed/" + item.folder + "/" + item.filename)
												.addClass("news_feed_edit_message_preview");
						mediaTitle = "видео";
					}
					if(item.mediaType == "youtube_video")
					{
						mediaPreview = $("<iframe>").addClass("max_100percents_100px")
													.attr("src", item.filename)
													.attr("frameborder", "0")
													.attr("allowfullscreen", "");
						mediaTitle = "youtube видео";
					}

					rowPreview.addClass(" alert alert-success");
					$("<div>").addClass("col-lg-2 col-md-3 col-sm-3 col-xs-5").appendTo(rowPreview).append(mediaPreview);
					$("<div>").addClass("col-lg-9 col-md-8 col-sm-7 col-xs-5").appendTo(rowPreview).append(mediaTitle);
					$("<div>").addClass("col-lg-1 col-md-1 col-sm-2 col-xs-2").appendTo(rowPreview).append(spanRemove);

					result = result.add(rowPreview);
				}
			}
		);

		return result;
	};

	var AllWayUp_ClickHandler = function()
	{
		var		curr_tag	= $(this);
		var		curr_row	= curr_tag.closest("div.row");
		var		partner_row	= $("#editPostMessage_PreviewImage div.row").first();

		if(curr_row.attr("id") != partner_row.attr("id"))
		{
			curr_row.slideToggle(function() {
					curr_row.prependTo(partner_row.parent()).slideToggle(); 
				} );

			$.getJSON("/cgi-bin/anyrole_1.cgi?action=AJAX_changeMessageImages_AllTheWayUp", {id: curr_row.attr("id").replaceAll(/\D/,"")})
					.done(function(data) {
						if(data.result == "success")
						{
							// --- good2go

						}
						else
						{
							system_calls.PopoverError(curr_tag, data.description);
						}
					});
		}

	};

	var OneStepUp_ClickHandler = function()
	{
		var		curr_tag	= $(this);
		var		curr_row	= curr_tag.closest("div.row");
		var		partner_row	= curr_row.prev();

		if(partner_row.length)
		{
			if(curr_row.attr("id") != partner_row.attr("id"))
			{
				curr_row.slideToggle(function() {
						curr_row.insertBefore(partner_row).slideToggle(); 
					} );

				$.getJSON("/cgi-bin/anyrole_1.cgi?action=AJAX_swapMessageImages", {id1: curr_row.attr("id").replaceAll(/\D/,""), id2: partner_row.attr("id").replaceAll(/\D/,"")})
						.done(function(data) {
							if(data.result == "success")
							{
								// --- good2go

							}
							else
							{
								system_calls.PopoverError(curr_tag, data.description);
							}
						});
			}
		}

	};

	var OneStepDown_ClickHandler = function()
	{
		var		curr_tag	= $(this);
		var		curr_row	= curr_tag.closest("div.row");
		var		partner_row	= curr_row.next();

		if(partner_row.length)
		{
			if(curr_row.attr("id") != partner_row.attr("id"))
			{
				curr_row.slideToggle(function() {
						curr_row.insertAfter(partner_row).slideToggle(); 
					} );

				$.getJSON("/cgi-bin/anyrole_1.cgi?action=AJAX_swapMessageImages", {id1: curr_row.attr("id").replaceAll(/\D/,""), id2: partner_row.attr("id").replaceAll(/\D/,"")})
						.done(function(data) {
							if(data.result == "success")
							{
								// --- good2go

							}
							else
							{
								system_calls.PopoverError(curr_tag, data.description);
							}
						});
			}
		}

	};

	var AllWayDown_ClickHandler = function()
	{
		var		curr_tag	= $(this);
		var		curr_row	= curr_tag.closest("div.row");
		var		partner_row	= $("#editPostMessage_PreviewImage div.row").last();

		if(curr_row.attr("id") != partner_row.attr("id"))
		{
			curr_row.slideToggle(function() {
					curr_row.appendTo(partner_row.parent()).slideToggle(); 
				} );

			$.getJSON("/cgi-bin/anyrole_1.cgi?action=AJAX_changeMessageImages_AllTheWayDown", {id: curr_row.attr("id").replaceAll(/\D/,"")})
					.done(function(data) {
						if(data.result == "success")
						{
							// --- good2go

						}
						else
						{
							system_calls.PopoverError(curr_tag, data.description);
						}
					});
		}

	};

	var EditNewsFeedModalRemoveImage = function()
	{
		var		currTag = $(this);
		var		currAction = currTag.data("action");
		var		imageID = currTag.data("imageid");

		$("div#rowPreviewImageID" + imageID).remove();

		$.getJSON("/cgi-bin/index.cgi?action=" + currAction, {imageID: imageID})
				.done(function(data) {
					if(data.result == "success")
					{
						// --- good2go
					}
					else
					{
						console.error("EditNewsFeedModalRemoveImage: " + currAction + ":ERROR: " + data.description);
					}
				});
	};

	var	EditNewsFeedPostMessage = function(e)
	{
		var	submit_button	= $(e.target);
		var	modal_tag		= submit_button.closest(".modal");
		var	error_message	= CheckModalValidity(modal_tag);

		if(error_message.length)
		{
			system_calls.PopoverError(modal_tag.find(".__submit"), error_message);
		}
		else
		{
			var data =
					{
						action:							"AJAX_updateNewsFeedMessage",
						newsFeedMessageID:				modal_tag.find(".__submit").data("messageID"),
						newsFeedMessageDstType:			modal_tag.find(".__message_dst").find("option:checked").attr("data-dst_type"),
						newsFeedMessageDstID:			modal_tag.find(".__message_dst").find("option:checked").attr("data-dst_id"),
						newsFeedMessageTitle:			modal_tag.find(".__title").val(),
						newsFeedMessageLink:			modal_tag.find(".__link").val(),
						newsFeedMessageText:			modal_tag.find(".__text").val(),
						newsFeedMessageRights:			modal_tag.find(".__access_rights").find("input:checked").val(),
						newsFeedMessageImageTempSet:	imageTempSet,
						random:							system_calls.GetUUID()
					};

			__MessageSubmitToServer(modal_tag, data);
		}
	};


	var DeleteMessage = function(messageID) 
	{
		// --- improve user Experience by removing message immediately
		// --- on a slow speed links users can continue seeing it some time
		$("div#message" + messageID).parent().empty();
		$.getJSON("/cgi-bin/index.cgi?action=AJAX_deleteNewsFeedMessage", {messageID: messageID})
				.done(function(data) 
				{
					if(data.result == "success")
					{
						ZeroizeThenUpdateNewsFeedThenScrollTo("");
					}
					else
					{
						console.error("DeleteMessage: getJSON(AJAX_deleteNewsFeedMessage).done():ERROR [" + data.description + "]");
					}
				});
	};

	var DeleteMessageComment = function(commentID) 
	{
		$.getJSON("/cgi-bin/index.cgi?action=AJAX_deleteNewsFeedComment", {commentID: commentID})
				.done(function(data) 
				{
					if(data.result == "success")
					{
						if($("#buttonNewsFeedViewMessageComment").data("action") == "AJAX_commentOnMessageInNewsFeed")
							RefreshMessageCommentsList($("#buttonNewsFeedViewMessageComment").data("messageID"));
						if($("#buttonNewsFeedViewMessageComment").data("action") == "AJAX_commentOnBookInNewsFeed")
							RefreshBookCommentsList($("#buttonNewsFeedViewMessageComment").data("bookID"));
						if($("#buttonNewsFeedViewMessageComment").data("action") == "AJAX_commentOnCertificationInNewsFeed")
							RefreshCertificationCommentsList($("#buttonNewsFeedViewMessageComment").data("certificationID"));
						if($("#buttonNewsFeedViewMessageComment").data("action") == "AJAX_commentOnScienceDegreeInNewsFeed")
							RefreshScienceDegreeCommentsList($("#buttonNewsFeedViewMessageComment").data("scienceDegreeID"));
					}
					else
					{
						console.error("DeleteMessageComment: getJSON(AJAX_deleteNewsFeedComment).done():ERROR [" + data.description + "]");
					}
				});
	};

	var LazyImageLoad = function()
	{
		$("img[data-lazyload]").each(function() 
			{
				var		lazyImg = $(this).attr("data-lazyload");

				if(lazyImg)
				{
					$(this).attr("src", lazyImg);
					$(this).attr("data-lazyload", "");
				}
			});

		// --- !!! It is important to rebuild carousel after downloading carousel-images
		$("div.carousel.slide").carousel("pause");
	};

	var NewMessageModalFreezeAllFields = function()
	{
		var		modal_tag = $("#NewsFeedNewMessage");

		modal_tag.find(".__title")			.attr("disabled", "");
		modal_tag.find(".__link")			.attr("disabled", "");
		modal_tag.find(".__text")			.attr("disabled", "");

		modal_tag.find(".__get_from_link")	.button("loading");
		modal_tag.find(".__submit")			.button("loading");
	};

	var NewMessageModalResetLayout = function()
	{
		var		modal_tag = $("#NewsFeedNewMessage");

		modal_tag.find(".__title")			.removeAttr("disabled");
		modal_tag.find(".__link")			.removeAttr("disabled");
		modal_tag.find(".__text")			.removeAttr("disabled");

		modal_tag.find(".__get_from_link")	.button("reset");
		modal_tag.find(".__submit")			.button("reset");
	};

	var GetDataFromProvidedURL = function(e)
	{
		var		curr_button		= $(e.target);
		var		modal_tag		= curr_button.closest(".modal");
		var		newMessageURL	= $("#newsFeedMessageLink").val();

		if(newMessageURL.length)
		{
			NewMessageModalFreezeAllFields();

			$.getJSON("/cgi-bin/index.cgi?action=AJAX_getURLMetaData", {url: newMessageURL, imageTempSet: imageTempSet})
					.done(function(data) {
						if(data.result == "success")
						{
							if(data.title.length)
							{
								$("#newsFeedMessageTitle").val($("#newsFeedMessageTitle").val() + system_calls.ConvertHTMLToText(data.title));
							}
							else
							{
								// field is empty
								$("#newsFeedMessageTitle").popover({"placement":"top", "content": "ничего не нашлось"})
														.popover("show");
								setTimeout(function () 
									{
										$("#newsFeedMessageTitle").popover("destroy");
									}, 3000);
							}

							if(data.description.length)
							{
								$("#newsFeedMessageText").val($("#newsFeedMessageText").val() + system_calls.ConvertHTMLToText(data.description));
							}
							else
							{
								// field is empty
								$("#newsFeedMessageText").popover({"placement":"top", "content": "ничего не нашлось"})
														.popover("show");
								setTimeout(function () 
									{
										$("#newsFeedMessageText").popover("destroy");
									}, 3000);
							}

							// --- add preview image to the list of already uploaded images and update GUI
							if(typeof(data.imageID) && typeof(data.imageURL) && data.imageID.length && data.imageURL.length)
							{
								// --- update GUI
								var		media_preview_area	 = modal_tag.find(".__media_preview_area");
								var 	containerPreview = $("<div>").appendTo(media_preview_area);
								var		rowPreview = $("<div>").appendTo(containerPreview)
																.addClass("row")
																.attr("id", "rowPreviewImageID" + data.imageID);
								var		mediaPreview, mediaComment;
								var		spanRemove = $("<span>").addClass("glyphicon glyphicon-remove color_red cursor_pointer")
																.on("click", EditNewsFeedModalRemoveImage)
																.attr("data-imageid", data.imageID)
																.attr("data-action", "AJAX_newsFeedMarkImageToRemove");

								if((typeof(data.mediaType) != "undefined") && (data.mediaType == "image"))
								{
									mediaPreview = $("<img/>").attr("src", "/images/feed/" + data.imageURL)
															.addClass("news_feed_edit_message_preview");
									mediaComment = "подготовленное изображение";
								}
								else if((typeof(data.mediaType) != "undefined") && (data.mediaType == "youtube_video"))
								{
									mediaPreview = $("<iframe>").addClass("max_100percents_100px")
																.attr("src", data.imageURL)
																.attr("frameborder", "0")
																.attr("allowfullscreen", "");
									mediaComment = "youtube видео";
								}
								else
								{
									console.debug("GetDataFromProvidedURL: server return unknown or undefined mediaType");
								}

								rowPreview.addClass("alert alert-success");
								$("<div>").addClass("col-lg-2 col-md-3 col-sm-3 col-xs-5").appendTo(rowPreview).append(mediaPreview);
								$("<div>").addClass("col-lg-8 col-md-7 col-sm-6 col-xs-3").appendTo(rowPreview).append(mediaComment);
								$("<div>").addClass("col-lg-1 col-md-1 col-sm-2 col-xs-3").appendTo(rowPreview).append(spanRemove);

								// --- add preview image to the list of already uploaded images
								globalPostMessageImageList.push({filename:"", imageID: data.imageID, imageURL:data.imageURL, jqXHR: "", result: "success", testStatus: ""});
							}

						}
						else
						{
							// field is empty
							$("#newsFeedMessageLink").popover({"placement":"top", "content": "ОШИБКА: " + data.description})
													.popover("show");
							setTimeout(function () 
								{
									$("#newsFeedMessageLink").popover("destroy");
								}, 3000);

							console.error("GetDataFromProvidedURL: getJSON(AJAX_getURLMetaData).done():ERROR [" + data.description + "]");
						}
					})
					.always(function() {
						NewMessageModalResetLayout();
					});
		}
		else
		{
			// field is empty
			$("#newsFeedMessageLink").popover({"placement":"top", "content": "напишите ссылку откуда взять данные"})
								.popover("show");
			setTimeout(function () 
				{
					$("#newsFeedMessageLink").popover("destroy");
				}, 3000);
		}
	};

	var isUserAvatarExist = function()
	{
		var		myUserAvatar = $("#myUserID").data("myuseravatar");

		if((myUserAvatar === "") || (myUserAvatar == "empty"))
		{
			if(Math.floor(Math.random() * 10) == 5)
				$("#UsernameUpdateAvatar").modal("show");

			return false; // --- UserAvatar needed to update
		}
		return true; // --- UserAvatar don't need to update
	};

	var isUsernameExist = function()
	{
		var myFirstName = $("#myFirstName").text();
		var myLastName = $("#myLastName").text();

		if((myFirstName === "") || (myLastName === ""))
		{
			if(myFirstName !== "")
			{
				$("#UsernameCredentialsFirstName").val(myFirstName);
			}
			if(myLastName !== "")
			{
				$("#UsernameCredentialsLastName").val(myLastName);
			}
			$("#UsernameCredentials").modal("show");

			return false; // --- Username needed to update
		}
		return true; // --- Username don't need to update
	};

	var UsernameUpdate = function()
	{
		var firstName = $("#UsernameCredentialsFirstName").val();
		var lastName = $("#UsernameCredentialsLastName").val();

		$("#myFirstName").text(firstName);
		$("#myLastName").text(lastName);


		$.getJSON("/cgi-bin/index.cgi?action=AJAX_updateFirstLastName", {firstName: firstName, lastName: lastName})
				.done(function(data) {
					console.debug("UsernameUpdateClickHandler: getJSON(AJAX_updateFirstLastName).done(): receive answer from server on 'like' click");

					if(data.result == "success")
					{
						// --- good2go
					}
				});

	};

	var BuildFriendBlock = function(item)
	{
		var		tagContainer, tagRowContainer, tagPhotoBlock, tagUserLink, tagPhotoCanvas, tagMainInfo, tagCompanyLink;
		var		result;

		tagContainer 	= $("<div/>").addClass("container-fluid");
		tagRowContainer	= $("<div/>").addClass("row single_block box-shadow--6dp ");
		tagPhotoBlock	= $("<div/>").addClass("col-md-1 col-xs-2 news_feed_photo_block padding_0px");
		tagUserLink		= $("<a>").attr("href", "/userprofile/" + item.friendID);
		tagCompanyLink	= $("<a>").attr("href", "/companyprofile/" + item.friendCompanyID + "?rand=" + system_calls.GetUUID());
		tagPhotoCanvas	= $("<canvas>")	.attr("width", "40")
										.attr("height", "40")
										.addClass("canvas-big-avatar")
										.addClass("canvas-width40px");
		tagMainInfo		= $("<div/>")	.addClass("col-md-10 col-xs-10 container ");

		tagContainer	.append(tagRowContainer);
		tagRowContainer	.append(tagMainInfo);
		tagRowContainer	.append(tagPhotoBlock)
						.append(tagMainInfo);
		tagPhotoBlock	.append(tagPhotoCanvas);
		tagMainInfo		.append(tagUserLink);
		tagUserLink		.append(item.friendName + " " + item.friendNameLast);
		if(item.friendUsersCompanyPositionTitle)
		{
			tagMainInfo	.append(" сейчас работает на должности " + item.friendUsersCompanyPositionTitle);
		}
		if(item.friendCompanyID)
		{
			tagCompanyLink.append(item.friendCompanyName);
			tagMainInfo	.append(" в ")
						.append(tagCompanyLink);
		}

		DrawUserAvatar(tagPhotoCanvas[0].getContext("2d"), item.friendAvatar, item.friendName, item.friendNameLast);

		result = tagContainer;
		return result;
	};

	var	IsMeHere = function(arr)
	{
		var	result = false;

		if(arr)
		{
			arr.forEach(
				function(item)
				{
					if(item.isMe == "yes")
					{
						result = true;
					}
				}
			);
		}

		return result;
	};

	var ButtonLikeRender = function(buttonLike)
	{
		var		listLikedUser = buttonLike.data("messageLikesUserList") || [];
		var		spanLike = $("<span>").addClass("fa fa-thumbs-" + (IsMeHere(listLikedUser) ? "" : "o-") + "up fa-lg");

		if((buttonLike.data("messageLikeType") == "likeUniversityDegree") || (buttonLike.data("messageLikeType") == "likeCertification"))
			spanLike = $("<span>").addClass("fa fa-graduation-cap fa-lg");

		buttonLike	.empty()
					.append(spanLike)
					.append(" " + listLikedUser.length + " ")
					.append((IsMeHere(listLikedUser)) ? "мне нравится " : "");
	};

	var ButtonLikeTooltipTitle = function(buttonLike)
	{
		var		strUserList = "";
		var		messageLikesUserList = buttonLike.data().messageLikesUserList || [];
		var		nameCounter = 0;

		messageLikesUserList.forEach(
			function(item, i) 
			{
				var		strUser = "";

				if(nameCounter < 4)
				{
					if(typeof(item.name) != "undefined")
					{
						strUser += item.name;
					}
					if(typeof(item.nameLast) != "undefined")
					{
						strUser += " " + item.nameLast;
					}
					if(strUser.length > 0)
					{
						if(i > 0)
						{
							strUserList += " , ";
						}
						strUserList += strUser;
						nameCounter++;
					}
				}
				if(nameCounter == 4)
				{
					strUserList += " ...";
					nameCounter++;
				}
			}
		);

		return strUserList;
	};

	var ButtonMessageLikeClickHandler = function ()
	{
		var	buttonLike = $(this);
		var	messageLikesUserList = buttonLike.data().messageLikesUserList;
		var	messageLikeType = buttonLike.data().messageLikeType;

		if(IsMeHere(messageLikesUserList))
		{
			var newArray = messageLikesUserList.filter(
				function(item)
				{
					if(item.isMe == "yes")
					{
						return false;
					}
					else
					{
						return true;
					}
				}
			);
			buttonLike.data().messageLikesUserList = newArray;
		}
		else
		{
			buttonLike.data().messageLikesUserList.push({"isMe":"yes"});
		}

		buttonLike.tooltip("destroy");

		ButtonLikeRender(buttonLike);

		buttonLike.attr("disabled", "");

		$.getJSON("/cgi-bin/index.cgi?action=JSON_ClickLikeHandler", {messageId: buttonLike.data().messageId, messageLikeType: messageLikeType})
				.done(function(data) {
					console.debug("ButtonMessageLikeClickHandler: getJSON(JSON_ClickLikeHandler).done(): receive answer from server on 'like' click");

					if(data.result == "success")
					{
						buttonLike.data("messageLikesUserList", data.messageLikesUserList);
						ButtonLikeRender(buttonLike);
					
						buttonLike.attr("title", ButtonLikeTooltipTitle(buttonLike));
						if(ButtonLikeTooltipTitle(buttonLike) !== "")
						{
							setTimeout(function() { buttonLike.tooltip(); }, 1000);
						}
					}

				})
				.fail(function() {
					console.error("ButtonMessageLikeClickHandler: FAIL to parse JSON response from server");
				})
				.always(function() {
					buttonLike.removeAttr("disabled");
				});
	};

	var WriteCommentButtonHandler = function()
	{
		var		messageID = $("#buttonNewsFeedViewMessageComment").data("messageID") ||
							$("#buttonNewsFeedViewMessageComment").data("usersBooksID") ||
							$("#buttonNewsFeedViewMessageComment").data("usersCertificationID") ||
							$("#buttonNewsFeedViewMessageComment").data("usersCourseID") ||
							$("#buttonNewsFeedViewMessageComment").data("usersLanguageID") ||
							$("#buttonNewsFeedViewMessageComment").data("usersCompanyID") ||
							$("#buttonNewsFeedViewMessageComment").data("scienceDegreeID");
		var		action = $("#buttonNewsFeedViewMessageComment").data("action");
		var		comment = $("#textareaNewsFeedViewMessage").val().trim();


		if(comment.length && action.length && messageID.length)
		{
			var		tempArray = Array.prototype.slice.call($("#divNewsFeedMessageReplyTo span[data-userid]"));
			var		replyToUserList = [];

			// --- empty comment immediately after comment submission
			// --- it avoids double submission in double-click event
			$("#textareaNewsFeedViewMessage").val("");
			$("#buttonNewsFeedViewMessageComment").button("loading");

			tempArray.forEach(function(item)
				{
					replyToUserList.push("@" + $(item).data("userid") + " ");
				});


			$.getJSON("/cgi-bin/index.cgi", {action: action, comment: replyToUserList.join("") + comment, messageID: messageID})
					.done(function(data) {
						console.debug("WriteCommentButtonHandler: done(): result = " + data.result);

						if(typeof($("#buttonNewsFeedViewMessageComment").data("messageID")) != "undefined") RefreshMessageCommentsList(messageID);
						if(typeof($("#buttonNewsFeedViewMessageComment").data("certificationTrackID")) != "undefined") RefreshCertificationCommentsList($("#buttonNewsFeedViewMessageComment").data("certificationTrackID"));
						if(typeof($("#buttonNewsFeedViewMessageComment").data("courseTrackID")) != "undefined") RefreshCertificationCommentsList($("#buttonNewsFeedViewMessageComment").data("courseTrackID"));
						if(typeof($("#buttonNewsFeedViewMessageComment").data("scienceDegreeUniversityID")) != "undefined") RefreshScienceDegreeCommentsList($("#buttonNewsFeedViewMessageComment").data("scienceDegreeUniversityID"));
						if(typeof($("#buttonNewsFeedViewMessageComment").data("bookID")) != "undefined") RefreshBookCommentsList($("#buttonNewsFeedViewMessageComment").data("bookID"));
						if(typeof($("#buttonNewsFeedViewMessageComment").data("companyID")) != "undefined") RefreshCompanyCommentsList($("#buttonNewsFeedViewMessageComment").data("companyID"));
						if(typeof($("#buttonNewsFeedViewMessageComment").data("languageID")) != "undefined") RefreshLanguageCommentsList($("#buttonNewsFeedViewMessageComment").data("languageID"));

						setTimeout(function() {$("#buttonNewsFeedViewMessageComment").button("reset"); }, 500); // --- wait for animation
					})
					.fail(function() {
						$("#buttonNewsFeedViewMessageComment").button("reset");
					});
		}
		else
		{
			$("#textareaNewsFeedViewMessage").focus();
			console.debug("WriteCommentButtonHandler: mandatory parameters are not defined.");
		}
	};

	var ButtonViewMessageClickHandler = function ()
	{
		var		messageID = $(this).data("messageId");
		var		messageObject = {};

		globalNewsFeed.forEach(function(item)
			{
				if((typeof(item.messageId) != "undefined") && (item.messageId == messageID))
				{
						messageObject = item;
				}
			});

		if(typeof(messageObject.messageId) != "undefined")
		{
			var		spanHeaderText = $("<span/>");
			var		spanHeaderLink = $("<a/>");
			var		srcObjName = messageObject.srcObj.name + " " + messageObject.srcObj.nameLast;

			$("#viewNewsFeedMessage").modal("show");

			$("#news_feed_view_message_header").empty().append("Просмотр сообщения");
			$("#spanNewsFeedViewMessageTimestamp").empty().text(system_calls.GetLocalizedDateInHumanFormatMsecSinceEvent(parseFloat(messageObject.eventTimestampDelta) * 1000));
	// system_calls.GetLocalizedDateFromDelta(jsonMessage.eventTimestampDelta)		
			if(srcObjName.length)
			{
				var		tagA = $("<a/>").append(srcObjName)
										.attr("href", GetHrefAttrFromSrcObj(messageObject));

				$("#spanNewsFeedViewMessageUsername").empty().append(tagA).append(system_calls.GetGenderedPhrase(messageObject, " написал(а)", " написал", " написала"));
			}

			spanHeaderText.append(system_calls.ReplaceTextLinkToURL(messageObject.messageTitle || "Просмотр сообщения"));

			if(messageObject.messageLink !== "")
			{
				spanHeaderLink.attr("href", messageObject.messageLink)
								.attr("target", "_blank")
								.append(spanHeaderText);

				$("#divNewsFeedMessageTitle").empty()
											.append(spanHeaderLink);
			}
			else
			{
				$("#divNewsFeedMessageTitle").empty()
											.append(spanHeaderText);
			}

			$("#divNewsFeedMessageBody").empty()
										.append(system_calls.ReplaceTextLinkToURL(messageObject.messageMessage));

			$("#buttonNewsFeedViewMessageComment").data("messageID", messageID)
													.data("action", "AJAX_commentOnMessageInNewsFeed");

			if(messageObject.messageImageList.length && messageObject.messageImageList[0].mediaType == "video")
				$("#divNewsFeedMessageBody").append(BuildCarousel(messageObject.messageImageList, false));
				// $("#divNewsFeedMessageBody").append(BuildVideoTag(messageObject.messageImageList));
			else if(messageObject.messageImageList.length && messageObject.messageImageList[0].mediaType == "image")
			{
				$("#divNewsFeedMessageBody").append(BuildCarousel(messageObject.messageImageList, false));
/*				setTimeout(function() {
					$("#divNewsFeedMessageBody div.carousel.slide[data_ride='carousel']").carousel("pause");
				}, 500);
*/				
			}
			else if(messageObject.messageImageList.length && messageObject.messageImageList[0].mediaType == "youtube_video")
				BuildYoutubeEmbedTag(messageObject.messageImageList, $("#divNewsFeedMessageBody"));

			RefreshMessageCommentsList(messageID);

			// --- this call is required for message_comment_modal to properly display all images in carousel
			LazyImageLoad();
		}
	};

	var ButtonViewBookClickHandler = function ()
	{
		var		usersBooksID = $(this).data("usersBooksID");
		var		bookID = $(this).data("bookID");
		var		bookObject = {};

		globalNewsFeed.forEach(function(item)
			{
				if((typeof(item.bookID) != "undefined") && (item.bookID == bookID))
					bookObject = item;
			});

		if(typeof(bookObject.bookID) != "undefined")
		{
			// --- RefreshBookCommentsList comes first to have additional time during modal showing event
			RefreshBookCommentsList(bookID);

			$("#viewNewsFeedMessage").modal("show");

			$("#divNewsFeedMessageTitle").empty().append("Информация о книге");
			$("#buttonNewsFeedViewMessageComment").data("bookID", bookID)
													.data("usersBooksID", usersBooksID)
													.data("action", "AJAX_commentOnBookInNewsFeed");

			RenderBookMainInfo(bookObject, $("#divNewsFeedMessageBody"));

		}
		else
		{
			console.error("ERROR: can't find bookID[" + bookID + "]");
		}
	};

	var ButtonViewCertificationClickHandler = function ()
	{
		var		usersCertificationID = $(this).data("usersCertificationID");
		var		certificationTrackID = $(this).data("certificationTrackID");
		var		certificationObject = {};

		globalNewsFeed.forEach(function(item)
			{
				if((typeof(item.certificationTrackID) != "undefined") && (item.certificationTrackID == certificationTrackID))
					certificationObject = item;
			});

		if(typeof(certificationObject.certificationTrackID) != "undefined")
		{
			// --- RefreshCertificationCommentsList comes first to have additional time during modal showing event
			RefreshCertificationCommentsList(certificationTrackID);

			$("#viewNewsFeedMessage").modal("show");

			$("#divNewsFeedMessageTitle").empty().append("Получение сертификата");
			$("#buttonNewsFeedViewMessageComment").data("certificationTrackID", certificationTrackID)
													.data("usersCertificationID", usersCertificationID)
													.data("action", "AJAX_commentOnCertificationInNewsFeed");

			RenderCertificationMainInfo(certificationObject, $("#divNewsFeedMessageBody"));

		}
		else
		{
			console.error("ERROR: can't find certificationTrackID[" + certificationTrackID + "]");
		}
	};

	var ButtonViewCourseClickHandler = function ()
	{
		var		usersCourseID = $(this).data("usersCourseID");
		var		courseTrackID = $(this).data("courseTrackID");
		var		courseObject = {};

		globalNewsFeed.forEach(function(item)
			{
				if((typeof(item.courseTrackID) != "undefined") && (item.courseTrackID == courseTrackID))
					courseObject = item;
			});

		if(typeof(courseObject.courseTrackID) != "undefined")
		{
			// --- RefreshCourseCommentsList comes first to have additional time during modal showing event
			RefreshCertificationCommentsList(courseTrackID);

			$("#viewNewsFeedMessage").modal("show");

			$("#divNewsFeedMessageTitle").empty().append("Прослушивание курса");
			$("#buttonNewsFeedViewMessageComment").data("courseTrackID", courseTrackID)
													.data("usersCourseID", usersCourseID)
													.data("action", "AJAX_commentOnCourseInNewsFeed");

			RenderCourseMainInfo(courseObject, $("#divNewsFeedMessageBody"));

		}
		else
		{
			console.error("ERROR: can't find courseTrackID[" + courseTrackID + "]");
		}
	};

	var ButtonViewLanguageClickHandler = function ()
	{
		var		languageID = $(this).data("languageID");
		var		usersLanguageID = $(this).data("usersLanguageID");
		var		languageObject = {};

		globalNewsFeed.forEach(function(item)
			{
				if((typeof(item.languageID) != "undefined") && (item.languageID == languageID))
					languageObject = item;
			});

		if(typeof(languageObject.languageID) != "undefined")
		{
			// --- RefreshLanguageCommentsList comes first to have additional time during modal showing event
			RefreshLanguageCommentsList(languageID);

			$("#viewNewsFeedMessage").modal("show");

			$("#divNewsFeedMessageTitle").empty().append("Иностранный язык");
			$("#buttonNewsFeedViewMessageComment").data("languageID", languageID)
													.data("usersLanguageID", usersLanguageID)
													.data("action", "AJAX_commentOnLanguageInNewsFeed");

			RenderLanguageMainInfo(languageObject, $("#divNewsFeedMessageBody"));

		}
		else
		{
			console.error("ERROR: can't find languageID[" + languageID + "]");
		}
	};

	var ButtonViewCompanyClickHandler = function ()
	{
		var		companyID = $(this).data("companyID");
		var		usersCompanyID = $(this).data("usersCompanyID");
		var		companyObject = {};

		globalNewsFeed.forEach(function(item)
			{
				if((typeof(item.companyID) != "undefined") && (item.companyID == companyID))
					companyObject = item;
			});

		if(typeof(companyObject.companyID) != "undefined")
		{
			// --- RefreshCompanyCommentsList comes first to have additional time during modal showing event
			RefreshCompanyCommentsList(companyID);

			$("#viewNewsFeedMessage").modal("show");

			$("#divNewsFeedMessageTitle").empty().append("Компания");
			$("#buttonNewsFeedViewMessageComment").data("companyID", companyID)
													.data("usersCompanyID", usersCompanyID)
													.data("action", "AJAX_commentOnCompanyInNewsFeed");

			RenderCompanyMainInfo(companyObject, $("#divNewsFeedMessageBody"));

		}
		else
		{
			console.error("ERROR: can't find companyID[" + companyID + "]");
		}
	};


	var ButtonViewScienceDegreeClickHandler = function ()
	{
		var		scienceDegreeID = $(this).data("scienceDegreeID");
		var		scienceDegreeUniversityID = $(this).data("scienceDegreeUniversityID");
		var		scienceDegreeObject = {};

		globalNewsFeed.forEach(function(item)
			{
				if((typeof(item.scienceDegreeID) != "undefined") && (item.scienceDegreeID == scienceDegreeID))
					scienceDegreeObject = item;
			});

		if(typeof(scienceDegreeObject.scienceDegreeID) != "undefined")
		{
			// --- RefreshScienceDegreeCommentsList comes first to have additional time during modal showing event
			RefreshScienceDegreeCommentsList(scienceDegreeUniversityID);

			$("#viewNewsFeedMessage").modal("show");

			$("#divNewsFeedMessageTitle").empty().append("Получение ученой степени");
			$("#buttonNewsFeedViewMessageComment").data("scienceDegreeID", scienceDegreeID)
													.data("scienceDegreeUniversityID", scienceDegreeUniversityID)
													.data("action", "AJAX_commentOnScienceDegreeInNewsFeed");

			RenderScienceDegreeMainInfo(scienceDegreeObject, $("#divNewsFeedMessageBody"));

		}
		else
		{
			console.error("ERROR: can't find scienceDegreeID[" + scienceDegreeID + "]");
		}
	};


	// --- function adds user from this tag to ReplyTo field
	var AddCommentOwnerToReply_ClickHandler = function()
	{
		var		currTag = $(this);
		var		replyToUserID = currTag.data("ownerID");
		var		replyToUserName = currTag.data("ownerName");

		if(replyToUserName.length && replyToUserID)
		{
			if($("#divNewsFeedMessageReplyTo span[data-userid=" + replyToUserID + "]").length)
			{
				console.error("ERROR: this user already in ReplyTo list");

				// --- notify user about adding
				currTag.popover({"placement":"top", "content": "Уже в списке"})
						.popover("show");
				setTimeout(function () 
					{
						currTag.popover("destroy");
					}, 3000);
			}
			else
			{
				var		removeSign = $("<span>").addClass("glyphicon glyphicon-remove cursor_pointer")
												.on("click", function()
													{
														// --- remove user from ReplyTo list
														$(this).parent().remove();
													});
				var		badge = $("<span>").append(replyToUserName)
											.append(" ")
											.append(removeSign)
											.attr("data-userid", replyToUserID)
											.addClass("label label-default");

				$("#divNewsFeedMessageReplyTo").append(badge).append(" ");

				// --- notify user about adding
				currTag.popover({"placement":"top", "content": "Добавлен"})
						.popover("show");
				setTimeout(function () 
					{
						currTag.popover("destroy");
					}, 3000);
			}
		}
		else
		{
			// --- notify user about adding
			currTag.popover({"placement":"top", "content": "Ошибка: добавления"})
					.popover("show");
			setTimeout(function () 
				{
					currTag.popover("destroy");
				}, 3000);
			console.error("ERROR: issue with looking for commentOwnerID or commentOwnerName");
		}

	};

	// --- build comments list
	// --- commentsArray - list  of comments
	// --- DOMtag - place in DOM-model
	var BuildCommentsList = function(commentsArray, DOMtag)
	{
		var		commentsUserArray = [];

		commentsArray = commentsArray.sort(function(item1, item2) { return ((parseFloat(item1.id) < parseFloat(item2.id)) ? -1 : 1); });

		// --- populate commentsUserArray with users-comment-writers (for ex: commentsUserArray["@23"]="Иван Кучин")
		commentsArray.forEach(function(item)
			{
				commentsUserArray["@" + item.user.userID] = "@" + item.user.name + " " + item.user.nameLast;
			});

		commentsArray.forEach(function(item, i)
		{
			var	spanUser = $("<span/>").append($("<a>").attr("href", "/userprofile/" + item.user.userID).append(item.user.name + " " + item.user.nameLast)).append(" написал(а) ");
			var	spanReplyTo = $("<span>").append($("<span>").addClass("fa fa-reply")).append(" <div class=\"display_inline hidden-xs\">ответить</div>")
										.data("ownerID", item.user.userID)
										.data("ownerName", item.user.name + " " + item.user.nameLast)
										.addClass("font_size_small color_grey margin_left_20 cursor_pointer")
										.on("click", AddCommentOwnerToReply_ClickHandler);
			var	spanTimestamp = $("<span/>").append(item.eventTimestampDelta)
											.addClass("news_feed_timestamp");
			var	divComment = $("<div/>");
			var	commentText = item.comment;

			if(i > 0) { DOMtag.append($("<div/>").addClass("news_feed_comment_separator")); }

			// --- replace @userID -> @name_nameLast
			Object.keys(commentsUserArray).forEach(function()
				{
					function convert(str, match)
					{
						return "<i>" + commentsUserArray[match] + "</i>";
					}
					commentText = commentText.replace(/(@\d+)/g, convert);
				});

			divComment = $("<div/>").append(commentText);
			DOMtag.append(spanUser).append(spanReplyTo).append(spanTimestamp).append(divComment);

			{
				// --- delete button

				var		myUserID = $("#myUserID").data("myuserid");

				if(item.user.userID == myUserID)
				{
					var		tagSpanTrashBin = $("<span/>").addClass("news_feed_trashbin_right");
					var		tagButtonTrashBin = $("<button/>").attr("type", "button")
																.addClass("btn btn-link")
																.data("commentID", item.id);
					var		tagImgTrashBin = $("<span>").addClass("glyphicon glyphicon-trash news_feed_trashbin");

					console.debug("BuildCommentsList: render delete icons for comment [" + item.id + "]");

					tagButtonTrashBin.on("click", function() {
						console.debug("BuildCommentsList: delete comment click handler [" + $(this).data("commentID") +"]");
						$("#deleteCommentFromFeedSubmit").data("commentID", $(this).data("commentID"));
						$("#DeleteCommentFromFeed").modal("show");
					});

					tagSpanTrashBin.append(tagButtonTrashBin.append(tagImgTrashBin));

					divComment.append(tagSpanTrashBin);
				}
			}
		
		});
	};


	// --- iOS based devices only
	// --- 1) modal open
	// --- 2) initial content size have to be smaller than screen vertical size
	// --- 3) after rendering, modal have to become larger (comments added in this case)
	// --- 4) y-scroll disabled because of bug
	// --- https://github.com/twbs/bootstrap/issues/14839
	var	Workaround_iOS_Scroll_Bug = function(isInit)
	{
		if(isMobile.apple.device)
		{
			if(isInit)
				$("#viewNewsFeedMessage .modal-content").css("min-height", $(window).height() + "px");
			else
				$("#viewNewsFeedMessage .modal-content").css("min-height", "");
		}
	};

	// --- clean-up & build comments list
	// --- messageID - comments to message
	var RefreshMessageCommentsList = function(messageID)
	{
		$("#textareaNewsFeedViewMessage").val("");
		$("#divNewsFeedMessageReplyTo").empty("");
		$("#divNewsFeedMessageComments").text("");
		Workaround_iOS_Scroll_Bug(true);

		$.getJSON("/cgi-bin/index.cgi?action=JSON_getCommentsOnMessage", {messageID: messageID})
		.done(function(data) {
			if(data.result == "success")
			{
				Workaround_iOS_Scroll_Bug(false);

				BuildCommentsList(data.commentsList, $("#divNewsFeedMessageComments"));

				// --- update number of comments on message === messageID
				$("button.btn.btn-link > img.news_feed_comment").parent().each(
						function(i, item) 
						{ 
							if($(item).data("messageId") === messageID)
							{
								$(item).empty().append($("<img/>").attr("src", "/images/pages/news_feed/comment.png").addClass("news_feed_comment")).append(" " + data.commentsList.length);
								return false;
							}
						});
			}
			else if(data.description == "re-login required")
			{
				window.location.href = data.link;
			}
			else
			{
				console.error("ERROR returned from JSON_getCommentsOnMessage (" + data.description + ")");
			}
		})
		.fail(function() {
			console.error("ERROR: parsing JSON response from server");
		});

	};

	// --- clean-up & build comments list
	// --- bookID - comments to book
	var RefreshBookCommentsList = function(bookID)
	{
		$("#textareaNewsFeedViewMessage").val("");
		$("#divNewsFeedMessageReplyTo").empty("");
		$("#divNewsFeedMessageComments").text("");
		$.getJSON("/cgi-bin/index.cgi?action=JSON_getCommentsOnBook", {messageID: bookID})
		.done(function(data) {
			if(data.result == "success")
			{
				BuildCommentsList(data.commentsList, $("#divNewsFeedMessageComments"));

				// --- update number of comments on book === bookID
				$("button.btn.btn-link > img.news_feed_comment").parent().each(
						function(i, item) 
						{
							if($(item).data("bookID") === bookID)
								$(item).empty().append($("<img/>").attr("src", "/images/pages/news_feed/comment.png").addClass("news_feed_comment")).append(" " + data.commentsList.length);
						});
			}
			else if(data.description == "re-login required")
			{
				window.location.href = data.link;
			}
			else
			{
				console.error("ERROR returned from JSON_getCommentsOnMessage (" + data.description + ")");
			}
		})
		.fail(function() {
			console.error("ERROR: parsing JSON response from server");
		});
	};

	// --- clean-up & build comments list
	// --- certificationID - comments to certification
	var RefreshCertificationCommentsList = function(certificationID)
	{
		$("#textareaNewsFeedViewMessage").val("");
		$("#divNewsFeedMessageReplyTo").empty("");
		$("#divNewsFeedMessageComments").text("");
		$.getJSON("/cgi-bin/index.cgi?action=JSON_getCommentsOnCertification", {messageID: certificationID})
		.done(function(data) {
			if(data.result == "success")
			{
				BuildCommentsList(data.commentsList, $("#divNewsFeedMessageComments"));

				// --- update number of comments on certification === certificationID
				$("button.btn.btn-link > img.news_feed_comment").parent().each(
						function(i, item) 
						{
							if($(item).data("certificationTrackID") === certificationID)
								$(item).empty().append($("<img/>").attr("src", "/images/pages/news_feed/comment.png").addClass("news_feed_comment")).append(" " + data.commentsList.length);
							if($(item).data("courseTrackID") === certificationID)
								$(item).empty().append($("<img/>").attr("src", "/images/pages/news_feed/comment.png").addClass("news_feed_comment")).append(" " + data.commentsList.length);
						});
			}
			else if(data.description == "re-login required")
			{
				window.location.href = data.link;
			}
			else
			{
				console.error("ERROR returned from JSON_getCommentsOnMessage (" + data.description + ")");
			}
		})
		.fail(function() {
			console.error("ERROR: parsing JSON response from server");
		});
	};

	// --- clean-up & build comments list
	// --- scienceDegreeID - comments to scienceDegree
	var RefreshScienceDegreeCommentsList = function(scienceDegreeID)
	{
		$("#textareaNewsFeedViewMessage").val("");
		$("#divNewsFeedMessageReplyTo").empty("");
		$("#divNewsFeedMessageComments").text("");
		$.getJSON("/cgi-bin/index.cgi?action=JSON_getCommentsOnScienceDegree", {messageID: scienceDegreeID})
		.done(function(data) {
			if(data.result == "success")
			{
				BuildCommentsList(data.commentsList, $("#divNewsFeedMessageComments"));

				// --- update number of comments on scienceDegree === scienceDegreeID
				$("button.btn.btn-link > img.news_feed_comment").parent().each(
						function(i, item) 
						{
							if($(item).data("scienceDegreeUniversityID") === scienceDegreeID)
								$(item).empty().append($("<img/>").attr("src", "/images/pages/news_feed/comment.png").addClass("news_feed_comment")).append(" " + data.commentsList.length);
						});
			}
			else if(data.description == "re-login required")
			{
				window.location.href = data.link;
			}
			else
			{
				console.error("ERROR returned from JSON_getCommentsOnMessage (" + data.description + ")");
			}
		})
		.fail(function() {
			console.error("ERROR: parsing JSON response from server");
		});
	};

	// --- clean-up & build comments list
	// --- companyID - comments to company
	var RefreshCompanyCommentsList = function(companyID)
	{
		$("#textareaNewsFeedViewMessage").val("");
		$("#divNewsFeedMessageReplyTo").empty("");
		$("#divNewsFeedMessageComments").text("");
		$.getJSON("/cgi-bin/index.cgi?action=JSON_getCommentsOnCompany", {messageID: companyID})
		.done(function(data) {
			if(data.result == "success")
			{
				BuildCommentsList(data.commentsList, $("#divNewsFeedMessageComments"));

				// --- update number of comments on company === companyID
				$("button.btn.btn-link > img.news_feed_comment").parent().each(
						function(i, item) 
						{
							if($(item).data("companyID") === companyID)
								$(item).empty().append($("<img/>").attr("src", "/images/pages/news_feed/comment.png").addClass("news_feed_comment")).append(" " + data.commentsList.length);
						});
			}
			else if(data.description == "re-login required")
			{
				window.location.href = data.link;
			}
			else
			{
				console.error("ERROR returned from JSON_getCommentsOnMessage (" + data.description + ")");
			}
		})
		.fail(function() {
			console.error("ERROR: parsing JSON response from server");
		});
	};

	// --- clean-up & build comments list
	// --- languageID - comments to language
	var RefreshLanguageCommentsList = function(languageID)
	{
		$("#textareaNewsFeedViewMessage").val("");
		$("#divNewsFeedMessageReplyTo").empty("");
		$("#divNewsFeedMessageComments").text("");
		$.getJSON("/cgi-bin/index.cgi?action=JSON_getCommentsOnLanguage", {messageID: languageID})
		.done(function(data) {
			if(data.result == "success")
			{
				BuildCommentsList(data.commentsList, $("#divNewsFeedMessageComments"));

				// --- update number of comments on language === languageID
				$("button.btn.btn-link > img.news_feed_comment").parent().each(
						function(i, item) 
						{
							if($(item).data("languageID") === languageID)
								$(item).empty().append($("<img/>").attr("src", "/images/pages/news_feed/comment.png").addClass("news_feed_comment")).append(" " + data.commentsList.length);
						});
			}
			else if(data.description == "re-login required")
			{
				window.location.href = data.link;
			}
			else
			{
				console.error("ERROR returned from JSON_getCommentsOnMessage (" + data.description + ")");
			}
		})
		.fail(function() {
			console.error("ERROR: parsing JSON response from server");
		});
	};

	var isVideoInMedia = function(media_list)
	{
		var	result = false;

		for(var i = 0; i < media_list.length; ++i)
		{
			if(media_list[i].mediaType == "video")
			{
				result = true;
				break;
			}
		}

		return result;
	};

	var Replicate_mp4_to_webm = function(video_list)
	{
		var	result	= [];
		var	video_clone;

		for(var i = 0; i < video_list.length; ++i)
		{
			result.push(video_list[i]);

			if(video_list[i].filename.indexOf(".webm") == -1)
			{
				video_clone = Object.create(video_list[i]);
				video_clone.filename = video_clone.filename.replace(".mp4", ".webm");
				result.push(video_clone);
			}
		}

		return result;
	};

	// --- attach video placement to DOMtag
	// --- videoList - video list
	var BuildVideoTag = function(videoList)
	{
		var		tagDivContainer = $("<div/>").addClass("videoTag");
		var		uniqueID;

		do
		{
			uniqueID = Math.round(Math.random() * 100000000);
		} while($("div#videoTag" + uniqueID).length);

		if(videoList.length > 0)
		{
			var		videoTag = $("<video>").addClass("videoPlacement")
											.attr("data_played_attempts", "0")
											.attr("id", "videoTag" + uniqueID)
											.attr("controls", "true");

			// --- dirty hack
			// --- add .webm file back to the list, due to .webm has been removed from the file list
			// --- during building carousel.
			videoList = Replicate_mp4_to_webm(videoList);


			// --- put the .webm on the first place
			videoList.sort(function(a, b)
			{
				if(a.filename.match(/.mp4$/) && b.filename.match(/.webm$/))
					return 1;
				return -1;
			});

			videoList.forEach(function(item)
			{	
				var		subtype = item.filename.match(/\.(.*)$/);
				var		srcTag = $("<source>")	.attr("src", "/video/feed/" + item.folder + "/" + item.filename)
												.attr("type", "video/" + (subtype[1] == "webm" ? "webm" : "mp4") );
				videoTag.append(srcTag);
			});

			tagDivContainer.append(videoTag);
		}
		else
		{
			console.error("media object is empty");
		}

		return tagDivContainer;
	};

	// --- attach youtube video placement to DOMtag
	// --- imageList - image list
	// --- DOMtag - video tag will be attached to that tag
	var BuildYoutubeEmbedTag = function(imageList, DOMtag)
	{
		var		uniqueID;
		do
		{
			uniqueID = Math.round(Math.random() * 100000000);
		} while($("div#youtubeEmbedTag" + uniqueID).length);

		if(imageList.length > 0)
		{
			var		tagDivContainer = $("<div/>").addClass("videoTag");
			var		videoTag = $("<iframe>").addClass("youtubeVideoPlacement")
											.attr("id", "youtubeEmbedTag" + uniqueID)
											.attr("src", imageList[0].filename)
											.attr("frameborder", "0")
											.attr("allowfullscreen", "");

			tagDivContainer.append(videoTag);
			DOMtag.append(tagDivContainer);
		}
	};


	// input:
	//  media - media object
	//  order - order in carousel (could be used for lazy load)
	var GetMediaTag = function(media, order)
	{
		var	tag;

		if(media.mediaType == "image")
		{
			tag = $("<img/>")	.attr((order  ? "data-lazyload" : "src"), "/images/feed/" + media.folder + "/" + media.filename);
		}
		else if(media.mediaType == "video")
		{
			// tag = $("<img/>")	.attr((order  ? "data-lazyload" : "src"), "/images/feed/" + media.folder + "/" + media.filename);
			tag = BuildVideoTag([media]);
		}
		else
		{
			console.error("unknown media type (" + media.mediaType + ")");
		}

		return tag;
	};

	var	CleanUpFromWebm = function(media_list)
	{
		var	result = [];
		var	media;

		for(var i = 0; i < media_list.length; ++i)
		{
			media = media_list[i];
			if((media.mediaType == "video") && (media.filename.indexOf(".webm") > 0))
			{
				// --- do not copy it to final list
			}
			else
			{
				result.push(media);
			}
		}

		return result;
	};

	// --- attach Carousel to DOMtag
	// --- imageList - image list
	// --- add_data_ride (true|false) - if true carousel will slide once visible, otherwise stands still
	var BuildCarousel = function(imageList, add_data_ride)
	{
		var		uniqueID;
		var		tagDivCarousel = $();

		do
		{
			uniqueID = Math.round(Math.random() * 100000000);
		} while($("div#carousel" + uniqueID).length);

		imageList = CleanUpFromWebm(imageList); // --- Dirty hack to keep number of media in the list 
												// --- equal to number of carousel items.
												// --- Must be a better way of doing that.

		if(imageList.length > 0)
		{
			// --- Image carousel
			var		imageArr = imageList;
			var		tagOlIndicator = $("<ol>")			.addClass("carousel-indicators");
			var		tagDivCarouselInner = $("<div/>")	.addClass("carousel-inner")
														.attr("role", "listbox");
			var		tagALeftCarouselControl = $("<a>")	.addClass("left carousel-control")
														.attr("href", "#carousel" + uniqueID)
														.attr("role", "button")
														.attr("data-slide", "prev");
			var		tagARightCarouselControl = $("<a>")	.addClass("right carousel-control")
														.attr("href", "#carousel" + uniqueID)
														.attr("role", "button")
														.attr("data-slide", "next");

			tagDivCarousel = $("<div/>")				.addClass("carousel slide")
														.attr("data_ride", add_data_ride ? "carousel" : "none")
														.attr("id", "carousel" + uniqueID);

			imageArr.sort(function(a, b)
				{
					var		orderA = parseInt(a.order);
					var		orderB = parseInt(b.order);
					var		result;

					if(orderA > orderB) { result = 1; }
					if(orderA == orderB) { result = 0; }
					if(orderA < orderB) { result = -1; }

					return result;
				});


			imageArr.forEach(
				function(item, i)
				{
					var	tagDivItem		= $("<div/>").addClass("item");
					// var	tagMediaItem	= $("<img/>").attr((i  ? "data-lazyload" : "src"), "/images/feed/" + item.folder + "/" + item.filename);

					if(i === 0) tagDivItem.addClass("active");

					// tagDivItem.append(tagMediaItem);
					tagDivItem.append(GetMediaTag(item, i));
					tagDivCarouselInner.append(tagDivItem);
				}
			);

			// --- render navigation buttons only if there is no video tag in the set
			// --- video control could interfere with carousel control, 
			// --- due to both controls are located at the same level
			if(!isVideoInMedia(imageArr))
			{
				// --- navigation buttons at the bottom
				imageArr.forEach(
					function(item, i)
					{
						var	tagLiIndicator = $("<li/>").attr("data-target", "#carousel" + uniqueID)
														.attr("data-slide-to", i);

						if(i === 0)
						{
							tagLiIndicator.addClass("active");
						}
						tagOlIndicator.append(tagLiIndicator);
					}
				);
			}

			// --- side navigation buttons
			tagALeftCarouselControl.append(
											$("<span>")	.addClass("glyphicon glyphicon-chevron-left")
														.attr("aria-hidden", "true")
									)
									.append(
											$("<span>")	.addClass("sr-only").append("Previous")
									);
			tagARightCarouselControl.append(
											$("<span>")	.addClass("glyphicon glyphicon-chevron-right")
														.attr("aria-hidden", "true")
									)
									.append(
											$("<span>")	.addClass("sr-only").append("Next")
									);

			tagDivCarousel	.append(tagOlIndicator)
							.append(tagDivCarouselInner)
							.append(tagALeftCarouselControl)
							.append(tagARightCarouselControl);
		} // --- end of carousel

		return tagDivCarousel;
	};

	var GetAverageRating = function(ratingArr)
	{
		var		result = 0;
		var		ratingItemsCount = 0;
		var		ratingItemsSum = 0;

		if(ratingArr && ratingArr.length)
		{
			ratingArr.forEach(function(item) {
				if(item > 0)
				{
					ratingItemsCount++;
					ratingItemsSum += item - 1;
				}
			});
			if(ratingItemsCount)
				result = Math.floor(ratingItemsSum / (ratingItemsCount * 4) * 200) - 100;
		}

		return result;
	};

	var GetTotalVoters = function(ratingArr)
	{
		var		ratingItemsCount = 0;

		if(ratingArr)
		{
			ratingArr.forEach(function(item) {
				if(item > 0) ratingItemsCount++;
			});
		}

		return ratingItemsCount;
	};


	var RenderBookMainInfo = function(jsonBook, DOMtag)
	{
		var		ratingCallback = function(rating)
								{
									$.getJSON("/cgi-bin/book.cgi?action=AJAX_setBookRating", {bookID: bookID, rating: rating, rand: Math.round(Math.random() * 100000000)})
									.done(function(data) {
										if(data.result == "success")
										{
											spanTotalRating.empty().append(GetAverageRating(data.bookReadersRatingList));
											spanTotalVoters.empty().append(GetTotalVoters(data.bookReadersRatingList));

											// --- required to update feed in case changing in modal dialog
											$("span.bookCommonRating" + bookID).empty().append(GetAverageRating(data.bookReadersRatingList));
											$("span.bookTotalVoters" + bookID).empty().append(GetTotalVoters(data.bookReadersRatingList));

											// --- update bookReadersRatingList in globalNewsFeed object
											globalNewsFeed.forEach(function(item, i)
												{
													if((typeof(item.bookID) != "undefined") && (item.bookID == bookID))
														globalNewsFeed[i].bookReadersRatingList = data.bookReadersRatingList;
												});
										}
										else
										{
										console.error("ratingCallback:ERROR: " + data.description);
										}
									});

									// --- update bookMyRating in globalNewsFeed object
									globalNewsFeed.forEach(function(item, i)
										{
											if((typeof(item.bookID) != "undefined") && (item.bookID == bookID))
												globalNewsFeed[i].bookMyRating = rating;
										});

									// --- required to update feed in case changing in modal dialog
									$("div.bookMyRating" + bookID + " input[data-rating='" + rating + "']").prop("checked", true);
								};

		var		divRow = $("<div>").addClass("row");
		var 	isbns = "";
		var		divMain = $("<div>").addClass("col-xs-12 col-sm-10");
		var		divCover = $("<div>").addClass("hidden-xs col-sm-2 margin_top_10 ");
		var		imgCover;
		var		imgXSCover;
		var		bookID = jsonBook.bookID;
		var		divRating = $("<div>").addClass("float_right");
		var		spanTotalRating = $("<span>").append(GetAverageRating(jsonBook.bookReadersRatingList));
		var		spanTotalVoters = $("<span>").append(GetTotalVoters(jsonBook.bookReadersRatingList));

		{
			// --- this function will be invoked for feed rendering and modal rendering
			// --- require to keep attr("id") uniq
			// --- first time will always be chosen Init value
			// --- first time will appear on rendering main page
			var		uniqueID = jsonBook.bookID;
			while($("#bookCommonRating" + uniqueID).length) {
				uniqueID = Math.floor(Math.random() * 100000000);
			}

			spanTotalRating.attr("id", "bookCommonRating" + uniqueID)
							.addClass("bookCommonRating" + jsonBook.bookID);
			spanTotalVoters.attr("id", "bookTotalVoters" + uniqueID)
							.addClass("bookTotalVoters" + jsonBook.bookID);
		}


		if((typeof(jsonBook.bookCoverPhotoFolder) != "undefined") && (typeof(jsonBook.bookCoverPhotoFilename) != "undefined") && (jsonBook.bookCoverPhotoFolder.length) && (jsonBook.bookCoverPhotoFilename.length))
		{
			imgCover = $("<img>").addClass("max_100percents_100px div_content_center_alignment niceborder cursor_pointer")
								.attr("src", "/images/books/" + jsonBook.bookCoverPhotoFolder + "/" + jsonBook.bookCoverPhotoFilename)
								.on("click", function() {
									$("#NewsFeedBookCoverDisplayModal").modal("show");
									$("#NewsFeedBookCoverDisplayModal span.bookTitle").empty().append(jsonBook.bookTitle);
									$("#NewsFeedBookCoverDisplayModal img").attr("src", "/images/books/" + jsonBook.bookCoverPhotoFolder + "/" + jsonBook.bookCoverPhotoFilename);
								});
			imgXSCover = $("<img>").addClass("max_100px visible-xs-inline niceborder cursor_pointer")
								.attr("src", "/images/books/" + jsonBook.bookCoverPhotoFolder + "/" + jsonBook.bookCoverPhotoFilename)
								.on("click", function() {
									$("#NewsFeedBookCoverDisplayModal").modal("show");
									$("#NewsFeedBookCoverDisplayModal span.bookTitle").empty().append(jsonBook.bookTitle);
									$("#NewsFeedBookCoverDisplayModal img").attr("src", "/images/books/" + jsonBook.bookCoverPhotoFolder + "/" + jsonBook.bookCoverPhotoFilename);
								});
		}
		else
		{
			imgCover = $("<img>").addClass("max_100percents_100px div_content_center_alignment scale_1_2")
								.attr("src", "/images/pages/news_feed/empty_book.jpg");
								// --- reason for having attr(id) unknown
								// .data("id", jsonBook.bookID);
			imgXSCover = $("<img>").addClass("max_100px visible-xs-inline scale_1_2")
								.attr("src", "/images/pages/news_feed/empty_book.jpg");
		}

		// --- book body start
		divMain.append(imgXSCover);
		divMain.append(divRating);

		if(jsonBook.bookTitle.length) divMain.append($("<h4/>").append(jsonBook.bookTitle));
		if(jsonBook.bookAuthorName !== "") divMain.append(jsonBook.bookAuthorName);

		if(jsonBook.bookISBN10 !== "") isbns = jsonBook.bookISBN10;
		if(isbns.length) isbns += " / ";
		if(jsonBook.bookISBN13 !== "") isbns += jsonBook.bookISBN13;
		if(isbns.length) isbns = "ISBN: " + isbns;
		divMain.append($("<h6>").addClass("color_grey").append(isbns));

		divRating	.append("рейтинг: ").append(spanTotalRating).append("% (голосов ").append(spanTotalVoters).append(")")
					.append("<br>моё мнение:<br>")
					.append(system_calls.RenderRating("bookMyRating" + jsonBook.bookID, jsonBook.bookMyRating, ratingCallback));


		divRow	.append(divCover.append(imgCover))
				.append(divMain);
		DOMtag	.append(divRow);
		// --- book body end
	};

	var RenderCertificationMainInfo = function(jsonCertification, DOMtag)
	{
		var		divRow = $("<div>").addClass("row");
		var		divMain = $("<div>").addClass("col-xs-8 col-sm-10");
		var		divCover = $("<div>").addClass("col-xs-4 col-sm-2 margin_top_10 ");
		var		imgLogo;


		if((typeof(jsonCertification.certificationVendorLogoFolder) != "undefined") && (typeof(jsonCertification.certificationVendorLogoFilename) != "undefined") && (jsonCertification.certificationVendorLogoFolder.length) && (jsonCertification.certificationVendorLogoFilename.length))
		{
			imgLogo = $("<img>").addClass("max_100percents_100px div_content_center_alignment niceborder cursor_pointer")
								.attr("src", "/images/certifications/" + jsonCertification.certificationVendorLogoFolder + "/" + jsonCertification.certificationVendorLogoFilename)
								.on("click", function() {
									$("#NewsFeedBookCoverDisplayModal").modal("show");
									$("#NewsFeedBookCoverDisplayModal span.bookTitle").empty().append(jsonCertification.certificationTrackTitle);
									$("#NewsFeedBookCoverDisplayModal img").attr("src", "/images/certifications/" + jsonCertification.certificationVendorLogoFolder + "/" + jsonCertification.certificationVendorLogoFilename);
								});
		}

		// --- certification body start
		divMain.append(imgLogo);

		divMain.append($("<h4/>").append(jsonCertification.certificationVendorName + " " + jsonCertification.certificationTrackTitle))
				.append(typeof(jsonCertification.certificationNumber) != "undefined" ? " #" + jsonCertification.certificationNumber : "");

		divRow	.append(divCover.append(imgLogo))
				.append(divMain);
		DOMtag	.append(divRow);
		// --- certification body end
	};

	var RenderGroupMainInfo = function(jsonGroup, DOMtag)
	{
		var		divRow = $("<div>").addClass("row");
		var		divMain = $("<div>").addClass("col-xs-8 col-sm-10");
		var		divDescription = $("<div>").addClass("col-xs-8 col-sm-10");
		var		divCover = $("<div>").addClass("col-xs-4 col-sm-2 margin_top_10 ");
		var		imgLogo;


		if((typeof(jsonGroup.groups[0].logo_folder) != "undefined") && (typeof(jsonGroup.groups[0].logo_filename) != "undefined") && (jsonGroup.groups[0].logo_folder.length) && (jsonGroup.groups[0].logo_filename.length))
		{
			imgLogo = $("<img>").addClass("max_100percents_100px div_content_center_alignment niceborder cursor_pointer")
								.attr("src", "/images/groups/" + jsonGroup.groups[0].logo_folder + "/" + jsonGroup.groups[0].logo_filename);
		}
		else
		{
			imgLogo = $("<canvas>")	.attr("width", "80")
									.attr("height", "80");
			system_calls.RenderCompanyLogo(imgLogo[0].getContext("2d"), "", jsonGroup.groups[0].title, "");
		}

		// --- group body start
		divMain.append($("<h4/>").append($("<a>").append(jsonGroup.groups[0].title).attr("href", "/group/" + jsonGroup.groups[0].link + "?rand=" + system_calls.GetUUID())));
		divDescription.append(jsonGroup.groups[0].description);

		divRow	.append(divCover.append($("<a>").append(imgLogo).attr("href", "/group/" + jsonGroup.groups[0].link + "?rand=" + system_calls.GetUUID())))
				.append(divMain)
				.append(divDescription);
		DOMtag	.append(divRow);
		// --- group body end
	};

	var RenderCompanySubscriptionMainInfo = function(jsonCompany, DOMtag)
	{
		var		divRow = $("<div>").addClass("row");
		var		divMain = $("<div>").addClass("col-xs-8 col-sm-10");
		var		divCover = $("<div>").addClass("col-xs-4 col-sm-2 margin_top_10 ");
		var		imgLogo;


		if((typeof(jsonCompany.companies[0].logo_folder) != "undefined") && (typeof(jsonCompany.companies[0].logo_filename) != "undefined") && (jsonCompany.companies[0].logo_folder.length) && (jsonCompany.companies[0].logo_filename.length))
		{
			imgLogo = $("<img>").addClass("max_100percents_100px div_content_center_alignment niceborder cursor_pointer")
								.attr("src", "/images/companies/" + jsonCompany.companies[0].logo_folder + "/" + jsonCompany.companies[0].logo_filename);
		}
		else
		{
			imgLogo = $("<canvas>")	.attr("width", "80")
									.attr("height", "80");
			system_calls.RenderCompanyLogo(imgLogo[0].getContext("2d"), "", jsonCompany.companies[0].name, "");
		}

		// --- company body start
		divMain.append($("<h4/>").append($("<a>").append(jsonCompany.companies[0].name).attr("href", "/company/" + jsonCompany.companies[0].link + "?rand=" + system_calls.GetUUID())));

		divRow	.append(divCover.append($("<a>").append(imgLogo).attr("href", "/company/" + jsonCompany.companies[0].link + "?rand=" + system_calls.GetUUID())))
				.append(divMain);
		DOMtag	.append(divRow);
		// --- company body end
	};

	var RenderCourseMainInfo = function(jsonCourse, DOMtag)
	{
		var		divRow = $("<div>").addClass("row");
		var		divMain = $("<div>").addClass("col-xs-8 col-sm-10");
		var		divCover = $("<div>").addClass("col-xs-4 col-sm-2 margin_top_10 ");
		var		imgLogo;
		var		courseID = jsonCourse.courseID;

		var		ratingCallback = function(rating)
								{
									$.getJSON("/cgi-bin/index.cgi?action=AJAX_setCourseRating", {courseID: courseID, rating: rating, rand: Math.round(Math.random() * 100000000)})
									.done(function(data) {
										if(data.result == "success")
										{
											spanTotalRating.empty().append(GetAverageRating(data.courseReadersRatingList));
											spanTotalVoters.empty().append(GetTotalVoters(data.courseReadersRatingList));

											// --- required to update feed in case changing in modal dialog
											$("span.courseCommonRating" + courseID).empty().append(GetAverageRating(data.courseReadersRatingList));
											$("span.courseTotalVoters" + courseID).empty().append(GetTotalVoters(data.courseReadersRatingList));

											// --- update courseReadersRatingList in globalNewsFeed object
											globalNewsFeed.forEach(function(item, i)
												{
													if((typeof(item.courseID) != "undefined") && (item.courseID == courseID))
														globalNewsFeed[i].courseReadersRatingList = data.courseReadersRatingList;
												});
										}
										else
										{
										console.error("ratingCallback:ERROR: " + data.description);
										}
									});

									// --- update courseMyRating in globalNewsFeed object
									globalNewsFeed.forEach(function(item, i)
										{
											if((typeof(item.courseID) != "undefined") && (item.courseID == courseID))
												globalNewsFeed[i].courseMyRating = rating;
										});

									// --- required to update feed in case changing in modal dialog
									$("div.courseMyRating" + courseID + " input[data-rating='" + rating + "']").prop("checked", true);
								};
		var		divRating = $("<div>").addClass("float_right");
		var		spanTotalRating = $("<span>").append(GetAverageRating(jsonCourse.courseRatingList));
		var		spanTotalVoters = $("<span>").append(GetTotalVoters(jsonCourse.courseRatingList));


		if((typeof(jsonCourse.courseVendorLogoFolder) != "undefined") && (typeof(jsonCourse.courseVendorLogoFilename) != "undefined") && (jsonCourse.courseVendorLogoFolder.length) && (jsonCourse.courseVendorLogoFilename.length))
		{
			imgLogo = $("<img>").addClass("max_100percents_100px div_content_center_alignment niceborder cursor_pointer")
								.attr("src", "/images/certifications/" + jsonCourse.courseVendorLogoFolder + "/" + jsonCourse.courseVendorLogoFilename)
								.on("click", function() {
									$("#NewsFeedBookCoverDisplayModal").modal("show");
									$("#NewsFeedBookCoverDisplayModal span.bookTitle").empty().append(jsonCourse.courseTrackTitle);
									$("#NewsFeedBookCoverDisplayModal img").attr("src", "/images/certifications/" + jsonCourse.courseVendorLogoFolder + "/" + jsonCourse.courseVendorLogoFilename);
								});
		}

		// --- course body start
		divMain.append(imgLogo)
				.append(divRating);

		divMain.append($("<h4/>").append(jsonCourse.courseVendorName + " " + jsonCourse.courseTrackTitle));

		divRow	.append(divCover.append(imgLogo))
				.append(divMain);

		divRating	.append("рейтинг: ").append(spanTotalRating).append("% (голосов ").append(spanTotalVoters).append(")")
					.append("<br>моё мнение:<br>")
					.append(system_calls.RenderRating("bookMyRating" + jsonCourse.courseTrackID, jsonCourse.courseMyRating, ratingCallback));

		DOMtag	.append(divRow);
		// --- course body end
	};

	var RenderScienceDegreeMainInfo = function(jsonScienceDegree, DOMtag)
	{
		var		divRow = $("<div>").addClass("row");
		var		divMain = $("<div>").addClass("col-xs-8 col-sm-10");
		var		divCover = $("<div>").addClass("col-xs-4 col-sm-2 margin_top_10 ");
		var		imgLogo;
		var		universityLocation = "";
		var		studyPeriodLength = 0;
		var		studyPeriodMessage = "";


		if((typeof(jsonScienceDegree.scienceDegreeUniversityLogoFolder) != "undefined") && (typeof(jsonScienceDegree.scienceDegreeUniversityLogoFilename) != "undefined") && (jsonScienceDegree.scienceDegreeUniversityLogoFolder.length) && (jsonScienceDegree.scienceDegreeUniversityLogoFilename.length))
		{
			imgLogo = $("<img>").addClass("max_100percents_100px div_content_center_alignment niceborder cursor_pointer")
								.attr("src", "/images/universities/" + jsonScienceDegree.scienceDegreeUniversityLogoFolder + "/" + jsonScienceDegree.scienceDegreeUniversityLogoFilename)
								.on("click", function() {
									$("#NewsFeedBookCoverDisplayModal").modal("show");
									$("#NewsFeedBookCoverDisplayModal span.bookTitle").empty().append(jsonScienceDegree.scienceDegreeUniversityTitle);
									$("#NewsFeedBookCoverDisplayModal img").attr("src", "/images/universities/" + jsonScienceDegree.scienceDegreeUniversityLogoFolder + "/" + jsonScienceDegree.scienceDegreeUniversityLogoFilename);
								});
		}

		if(jsonScienceDegree.scienceDegreeUniversityCountryTitle.length) universityLocation = jsonScienceDegree.scienceDegreeUniversityCountryTitle;
		if(jsonScienceDegree.scienceDegreeUniversityRegionTitle.length)
		{
			if(universityLocation.length) universityLocation += ", ";
			universityLocation += jsonScienceDegree.scienceDegreeUniversityRegionTitle;
		}

		if(jsonScienceDegree.scienceDegreeStart.length && jsonScienceDegree.scienceDegreeFinish.length)
		{
			studyPeriodLength = parseInt(jsonScienceDegree.scienceDegreeFinish) - parseInt(jsonScienceDegree.scienceDegreeStart) + 1;
			studyPeriodMessage = "<br>c " + jsonScienceDegree.scienceDegreeStart + " по " + jsonScienceDegree.scienceDegreeFinish;
			studyPeriodMessage += " (" + studyPeriodLength + " " + system_calls.GetYearsSpelling(studyPeriodLength);
			studyPeriodMessage +=  ")";
		}

		// --- scienceDegree body start
		// divMain.append(imgLogo);

		divMain.append($("<h4/>").append(jsonScienceDegree.scienceDegreeTitle + " в " + jsonScienceDegree.scienceDegreeUniversityTitle))
				.append(universityLocation + studyPeriodMessage);

		divRow	.append(divCover.append(imgLogo))
				.append(divMain);
		DOMtag	.append(divRow);
		// --- scienceDegree body end
	};

	var RenderLanguageMainInfo = function(jsonLanguage, DOMtag)
	{
		var		divRow = $("<div>").addClass("row");
		var		divMain = $("<div>").addClass("col-xs-8 col-sm-10");
		var		divCover = $("<div>").addClass("col-xs-4 col-sm-2 margin_top_10 ");
		var		imgLogo;


		if((typeof(jsonLanguage.languageLogoFolder) != "undefined") && (typeof(jsonLanguage.languageLogoFilename) != "undefined") && (jsonLanguage.languageLogoFolder.length) && (jsonLanguage.languageLogoFilename.length))
		{
			imgLogo = $("<img>").addClass("max_100percents_100px div_content_center_alignment niceborder cursor_pointer")
								.attr("src", "/images/flags/" + jsonLanguage.languageLogoFolder + "/" + jsonLanguage.languageLogoFilename)
								.on("click", function() {
									$("#NewsFeedBookCoverDisplayModal").modal("show");
									$("#NewsFeedBookCoverDisplayModal span.bookTitle").empty().append(jsonLanguage.languageUniversityTitle);
									$("#NewsFeedBookCoverDisplayModal img").attr("src", "/images/flags/" + jsonLanguage.languageLogoFolder + "/" + jsonLanguage.languageLogoFilename);
								});
		}

		// --- language body start
		divMain.append($("<h4/>").append(jsonLanguage.languageTitle + " до уровня " + jsonLanguage.languageLevel));

		divRow	.append(divCover.append(imgLogo))
				.append(divMain);
		DOMtag	.append(divRow);
		// --- language body end
	};

	var RenderCompanyMainInfo = function(jsonCompany, DOMtag)
	{
		var		divRow = $("<div>").addClass("row");
		var		divMain = $("<div>").addClass("col-xs-8 col-sm-10");
		var		divCover = $("<div>").addClass("col-xs-4 col-sm-2 margin_top_10 ");
		var		imgLogo;


		if((typeof(jsonCompany.companyLogoFolder) != "undefined") && (typeof(jsonCompany.companyLogoFilename) != "undefined") && (jsonCompany.companyLogoFolder.length) && (jsonCompany.companyLogoFilename.length))
		{
			imgLogo = $("<img>").addClass("max_100percents_100px div_content_center_alignment niceborder cursor_pointer")
								.attr("src", "/images/companies/" + jsonCompany.companyLogoFolder + "/" + jsonCompany.companyLogoFilename)
								.on("click", function() {
									$("#NewsFeedBookCoverDisplayModal").modal("show");
									$("#NewsFeedBookCoverDisplayModal span.bookTitle").empty().append(jsonCompany.companyUniversityTitle);
									$("#NewsFeedBookCoverDisplayModal img").attr("src", "/images/companies/" + jsonCompany.companyLogoFolder + "/" + jsonCompany.companyLogoFilename);
								});
		}

		// --- company body start
		divMain.append($("<h4/>").append(jsonCompany.companyPositionTitle + " в " + jsonCompany.companyTitle));

		divRow	.append(divCover.append(imgLogo))
				.append(divMain);
		DOMtag	.append(divRow);
		// --- company body end
	};



	// --- build book block 
	// --- used for book and citing
	var RenderBookBody = function(jsonBook, DOMtag)
	{

		// --- assign bookID to be able to scroll to this book
		DOMtag.attr("id", "book" + jsonBook.bookID);

		RenderBookMainInfo(jsonBook, DOMtag);

		{
		// --- like, comment, delete, edit buttons

			var		tagDiv6_1 = $("<div>");
			var		tagSpan7_1 = $("<span/>");
			var		buttonLike = $("<button/>").attr("type", "button")
											.addClass("btn btn-link")
											.data("messageId", jsonBook.usersBooksID)
											.data("messageLikesUserList", jsonBook.messageLikesUserList)
											.data("messageLikeType", "likeBook")
											.on("click", ButtonMessageLikeClickHandler);

					buttonLike	.attr("title", ButtonLikeTooltipTitle(buttonLike))
								.tooltip({ animation: "animated bounceIn", placement: "top" });
			var		tagSpan7_2 = $("<span/>");
			var		buttonComment = $("<button/>").attr("type", "button")
											.addClass("btn btn-link")
											.data("bookID", jsonBook.bookID)
											.data("usersBooksID", jsonBook.usersBooksID)
											.on("click", ButtonViewBookClickHandler);
			var		imgComment = $("<img>").attr("src", "/images/pages/news_feed/comment.png")
											.addClass("news_feed_comment");


			DOMtag.append(tagDiv6_1);
			tagDiv6_1.append(tagSpan7_1);
			tagSpan7_1.append(buttonLike)
						.append(" ");

			ButtonLikeRender(buttonLike);

			tagDiv6_1.append(tagSpan7_2);
			tagSpan7_2.append(buttonComment);
			buttonComment.append(imgComment)
					.append(" " + jsonBook.bookCommentsCount + "");

		} // --- end like, comment
	};

	// --- build group block 
	// --- used for group and citing
	var RenderGroupBody = function(jsonGroup, DOMtag)
	{
		// --- assign groupID to be able to scroll to this group
		DOMtag.attr("id", "group" + jsonGroup.groupID);

		RenderGroupMainInfo(jsonGroup, DOMtag);
	};

	// --- build company block 
	// --- used for company and citing
	var RenderCompanySubscriptionBody = function(jsonCompany, DOMtag)
	{
		// --- assign groupID to be able to scroll to this company
		DOMtag.attr("id", "company" + jsonCompany.groupID);

		RenderCompanySubscriptionMainInfo(jsonCompany, DOMtag);
	};

	// --- build certification block 
	// --- used for certification and citing
	var RenderCertificationBody = function(jsonCertification, DOMtag)
	{
		if(jsonCertification.certificationID && jsonCertification.certificationID.length) DOMtag.attr("id", "certification" + jsonCertification.certificationID);

		RenderCertificationMainInfo(jsonCertification, DOMtag);

		{
		// --- like, comment, delete, edit buttons

			var		tagDiv6_1 = $("<div>");
			var		tagSpan7_1 = $("<span/>");
			var		buttonLike = $("<button/>").attr("type", "button")
											.addClass("btn btn-link")
											.data("messageId", jsonCertification.certificationID)
											.data("messageLikeType", "likeCertification")
											.data("messageLikesUserList", jsonCertification.messageLikesUserList)
											.on("click", ButtonMessageLikeClickHandler);

					buttonLike	.attr("title", ButtonLikeTooltipTitle(buttonLike))
								.tooltip({ animation: "animated bounceIn", placement: "top" });
			var		tagSpan7_2 = $("<span/>");
			var		buttonComment = $("<button/>").attr("type", "button")
											.addClass("btn btn-link")
											.data("certificationTrackID", jsonCertification.certificationTrackID)
											.data("usersCertificationID", jsonCertification.certificationID)
											.on("click", ButtonViewCertificationClickHandler);
			var		imgComment = $("<img>").attr("src", "/images/pages/news_feed/comment.png")
											.addClass("news_feed_comment");


			DOMtag.append(tagDiv6_1);
			tagDiv6_1.append(tagSpan7_1);
			tagSpan7_1.append(buttonLike)
						.append(" ");

			ButtonLikeRender(buttonLike);

			tagDiv6_1.append(tagSpan7_2);
			tagSpan7_2.append(buttonComment);
			buttonComment.append(imgComment)
					.append(" " + jsonCertification.certificationCommentsCount + "");

		} // --- end like, comment

	};

	// --- build course block 
	// --- used for course and citing
	var RenderCourseBody = function(jsonCourse, DOMtag)
	{
		if(jsonCourse.usersCourseID && jsonCourse.usersCourseID.length) DOMtag.attr("id", "usercourse" + jsonCourse.usersCourseID);
		if(jsonCourse.courseID && jsonCourse.courseID.length) DOMtag.append("<div id=\"course" + jsonCourse.courseID + "\"></div>");

		RenderCourseMainInfo(jsonCourse, DOMtag);

		{
		// --- like, comment, delete, edit buttons

			var		tagDiv6_1 = $("<div>");
			var		tagSpan7_1 = $("<span/>");
			var		buttonLike = $("<button/>").attr("type", "button")
											.addClass("btn btn-link")
											.data("messageId", jsonCourse.usersCourseID)
											.data("messageLikeType", "likeCourse")
											.data("messageLikesUserList", jsonCourse.messageLikesUserList)
											.on("click", ButtonMessageLikeClickHandler);

					buttonLike	.attr("title", ButtonLikeTooltipTitle(buttonLike))
								.tooltip({ animation: "animated bounceIn", placement: "top" });
			var		tagSpan7_2 = $("<span/>");
			var		buttonComment = $("<button/>").attr("type", "button")
											.addClass("btn btn-link")
											.data("courseTrackID", jsonCourse.courseTrackID)
											.data("usersCourseID", jsonCourse.usersCourseID)
											.on("click", ButtonViewCourseClickHandler);
			var		imgComment = $("<img>").attr("src", "/images/pages/news_feed/comment.png")
											.addClass("news_feed_comment");


			DOMtag.append(tagDiv6_1);
			tagDiv6_1.append(tagSpan7_1);
			tagSpan7_1.append(buttonLike)
						.append(" ");

			ButtonLikeRender(buttonLike);

			tagDiv6_1.append(tagSpan7_2);
			tagSpan7_2.append(buttonComment);
			buttonComment.append(imgComment)
					.append(" " + jsonCourse.courseCommentsCount + "");

		} // --- end like, comment

	};


	// --- build scienceDegree block 
	// --- used for scienceDegree and citing
	var RenderScienceDegreeBody = function(jsonScienceDegree, DOMtag)
	{

		// --- assign scienceDegreeID to be able to scroll to this scienceDegree
		if(jsonScienceDegree.scienceDegreeID && jsonScienceDegree.scienceDegreeID.length) DOMtag.attr("id", "scienceDegree" + jsonScienceDegree.scienceDegreeID);
		if(jsonScienceDegree.scienceDegreeUniversityID && jsonScienceDegree.scienceDegreeUniversityID.length) DOMtag.append("<div id=\"university" + jsonScienceDegree.scienceDegreeUniversityID + "\"></div>");

		RenderScienceDegreeMainInfo(jsonScienceDegree, DOMtag);

		{
		// --- like, comment, delete, edit buttons

			var		tagDiv6_1 = $("<div>");
			var		tagSpan7_1 = $("<span/>");
			var		buttonLike = $("<button/>").attr("type", "button")
											.addClass("btn btn-link")
											.data("messageId", jsonScienceDegree.scienceDegreeID)
											.data("messageLikesUserList", jsonScienceDegree.messageLikesUserList)
											.data("messageLikeType", "likeUniversityDegree")
											.on("click", ButtonMessageLikeClickHandler);

					buttonLike	.attr("title", ButtonLikeTooltipTitle(buttonLike))
								.tooltip({ animation: "animated bounceIn", placement: "top" });
			var		tagSpan7_2 = $("<span/>");
			var		buttonComment = $("<button/>").attr("type", "button")
											.addClass("btn btn-link")
											.data("scienceDegreeID", jsonScienceDegree.scienceDegreeID)
											.data("scienceDegreeUniversityID", jsonScienceDegree.scienceDegreeUniversityID)
											.on("click", ButtonViewScienceDegreeClickHandler);
			var		imgComment = $("<img>").attr("src", "/images/pages/news_feed/comment.png")
											.addClass("news_feed_comment");

			DOMtag.append(tagDiv6_1);
			tagDiv6_1.append(tagSpan7_1);
			tagSpan7_1.append(buttonLike)
						.append(" ");

			ButtonLikeRender(buttonLike);

			tagDiv6_1.append(tagSpan7_2);
			tagSpan7_2.append(buttonComment);
			buttonComment.append(imgComment)
					.append(" " + jsonScienceDegree.scienceDegreeCommentsCount + "");

		} // --- end like, comment

	};

	// --- build language block 
	// --- used for language and citing
	var RenderLanguageBody = function(jsonLanguage, DOMtag)
	{
		// --- assign languageID to be able to scroll to this language
		if(jsonLanguage.usersLanguageID && jsonLanguage.usersLanguageID.length) DOMtag.attr("id", "userLanguage" + jsonLanguage.usersLanguageID);
		if(jsonLanguage.languageID && jsonLanguage.languageID.length) DOMtag.append("<div id=\"language" + jsonLanguage.languageID + "\"></div>");

		RenderLanguageMainInfo(jsonLanguage, DOMtag);

		{
		// --- like, comment, delete, edit buttons

			var		tagDiv6_1 = $("<div>");
			var		tagSpan7_1 = $("<span/>");
			var		buttonLike = $("<button/>").attr("type", "button")
											.addClass("btn btn-link")
											.data("messageId", jsonLanguage.usersLanguageID)
											.data("messageLikesUserList", jsonLanguage.messageLikesUserList)
											.data("messageLikeType", "likeLanguage")
											.on("click", ButtonMessageLikeClickHandler);

					buttonLike	.attr("title", ButtonLikeTooltipTitle(buttonLike))
								.tooltip({ animation: "animated bounceIn", placement: "top" });
			var		tagSpan7_2 = $("<span/>");
			var		buttonComment = $("<button/>").attr("type", "button")
											.addClass("btn btn-link")
											.data("languageID", jsonLanguage.languageID)
											.data("usersLanguageID", jsonLanguage.usersLanguageID)
											.on("click", ButtonViewLanguageClickHandler);
			var		imgComment = $("<img>").attr("src", "/images/pages/news_feed/comment.png")
											.addClass("news_feed_comment");

			DOMtag.append(tagDiv6_1);
			tagDiv6_1.append(tagSpan7_1);
			tagSpan7_1.append(buttonLike)
						.append(" ");

			ButtonLikeRender(buttonLike);

			tagDiv6_1.append(tagSpan7_2);
			tagSpan7_2.append(buttonComment);
			buttonComment.append(imgComment)
					.append(" " + jsonLanguage.languageCommentsCount + "");

		} // --- end like, comment

	};

	// --- build company block 
	// --- used for company and citing
	var RenderCompanyBody = function(jsonCompany, DOMtag)
	{
		// --- assign companyID to be able to scroll to this company
		if(jsonCompany.usersCompanyID && jsonCompany.usersCompanyID.length) DOMtag.attr("id", "vacancy" + jsonCompany.usersCompanyID);
		if(jsonCompany.companyID && jsonCompany.companyID.length) DOMtag.append("<div id=\"company" + jsonCompany.companyID + "\"></div>");

		RenderCompanyMainInfo(jsonCompany, DOMtag);

		{
		// --- like, comment, delete, edit buttons

			var		tagDiv6_1 = $("<div>");
			var		tagSpan7_1 = $("<span/>");
			var		buttonLike = $("<button/>").attr("type", "button")
											.addClass("btn btn-link")
											.data("messageId", jsonCompany.usersCompanyID)
											.data("messageLikesUserList", jsonCompany.messageLikesUserList)
											.data("messageLikeType", "likeCompany")
											.on("click", ButtonMessageLikeClickHandler);

					buttonLike	.attr("title", ButtonLikeTooltipTitle(buttonLike))
								.tooltip({ animation: "animated bounceIn", placement: "top" });
			var		tagSpan7_2 = $("<span/>");
			var		buttonComment = $("<button/>").attr("type", "button")
											.addClass("btn btn-link")
											.data("companyID", jsonCompany.companyID)
											.data("usersCompanyID", jsonCompany.usersCompanyID)
											.on("click", ButtonViewCompanyClickHandler);
			var		imgComment = $("<img>").attr("src", "/images/pages/news_feed/comment.png")
											.addClass("news_feed_comment");

			DOMtag.append(tagDiv6_1);
			tagDiv6_1.append(tagSpan7_1);
			tagSpan7_1.append(buttonLike)
						.append(" ");

			ButtonLikeRender(buttonLike);

			tagDiv6_1.append(tagSpan7_2);
			tagSpan7_2.append(buttonComment);
			buttonComment.append(imgComment)
					.append(" " + jsonCompany.companyCommentsCount + "");

		} // --- end like, comment

	};

	// --- build message block 
	// --- used for message and citing
	var RenderMessageBody = function(jsonMessage, DOMtag)
	{
		// --- assign MessageID to be able to scroll to this message
		if(jsonMessage.messageId && jsonMessage.messageId.length) DOMtag.attr("id", "message" + jsonMessage.messageId);
		// --- Message post
		if(jsonMessage.messageTitle !== "")
		{
			if(jsonMessage.messageLink !== "")
			{
				var		tagHeader5 = $("<h4/>");
				var		tagA6_1 = $("<a/>").attr("href", jsonMessage.messageLink)
											.attr("target", "_blank");
				tagA6_1.append(jsonMessage.messageTitle);

				tagHeader5.append(tagA6_1);
				DOMtag.append(tagHeader5);
			}
			else
			{
				DOMtag.append($("<h4/>").append(system_calls.ReplaceTextLinkToURL(jsonMessage.messageTitle)));				
			}
		}
		if(jsonMessage.messageMessage !== "")
		{
			DOMtag.append(system_calls.ReplaceTextLinkToURL(jsonMessage.messageMessage));
		}

		if(jsonMessage.messageImageList.length && jsonMessage.messageImageList[0].mediaType == "video")
			DOMtag.append(BuildCarousel(jsonMessage.messageImageList, true));
			// DOMtag.append(BuildVideoTag(jsonMessage.messageImageList));
		else if(jsonMessage.messageImageList.length && jsonMessage.messageImageList[0].mediaType == "image")
			DOMtag.append(BuildCarousel(jsonMessage.messageImageList, true));
		else if(jsonMessage.messageImageList.length && jsonMessage.messageImageList[0].mediaType == "youtube_video")
			BuildYoutubeEmbedTag(jsonMessage.messageImageList, DOMtag);

		// --- like, comment, delete, edit buttons
		{
			var		tagDivMain = $("<div>");
			var		tagSpanLike = $("<span/>");
			var		buttonLike = $("<button/>").attr("type", "button")
											.addClass("btn btn-link")
											.data("messageId", jsonMessage.messageId)
											.data("messageLikesUserList", jsonMessage.messageLikesUserList)
											.on("click", ButtonMessageLikeClickHandler);

					buttonLike	.attr("title", ButtonLikeTooltipTitle(buttonLike))
								.tooltip({ animation: "animated bounceIn", placement: "top" });
			var		tagSpanComment = $("<span/>");
			var		tagButtonComment = $("<button/>").attr("type", "button")
											.addClass("btn btn-link")
											.data("messageId", jsonMessage.messageId)
											.on("click", ButtonViewMessageClickHandler);
			var		imgComment = $("<img>").attr("src", "/images/pages/news_feed/comment.png")
											.addClass("news_feed_comment");

			var		myUserID = $("#myUserID").data("myuserid");

			DOMtag.append(tagDivMain);
			tagDivMain.append(tagSpanLike);
			tagSpanLike.append(buttonLike)
						.append(" ");

			ButtonLikeRender(buttonLike);

			tagDivMain.append(tagSpanComment);
			tagSpanComment.append(tagButtonComment);
			tagButtonComment.append(imgComment)
					.append(" " + jsonMessage.messageCommentsCount + "");

			if(
				((jsonMessage.srcObj.type == "user") && (jsonMessage.srcObj.id == myUserID)) ||
				((jsonMessage.srcObj.type == "company") && (globalMyCompanies.indexOf(parseFloat(jsonMessage.srcObj.id)) >= 0))
			)
			{
				var		tagSpanTrashBin = $("<span/>").addClass("news_feed_trashbin_right");
				var		tagButtonTrashBin = $("<button/>").attr("type", "button")
															.addClass("btn btn-link")
															.data("messageID", jsonMessage.messageId);
				var		tagImgTrashBin = $("<span>").addClass("glyphicon glyphicon-trash news_feed_trashbin");

				var		tagSpanPencil = $("<span/>").addClass("news_feed_pencil_right");
				var		tagButtonPencil = $("<button/>").attr("type", "button")
															.addClass("btn btn-link")
															.data("messageID", jsonMessage.messageId);
				var		tagImgPencil = $("<span>").addClass("glyphicon glyphicon-pencil news_feed_pencil");

				tagButtonTrashBin.on("click", function() {
					$("#deleteMessageFromFeedSubmit").data("messageID", $(this).data("messageID"));
					$("#DeleteMessageFromFeed").modal("show");
				});
				tagButtonPencil.on("click", function() {
					$("#editNewsFeedMessageSubmit").data("messageID", $(this).data("messageID"));
					$("#editNewsFeedMessage").modal("show");
				});

				tagSpanTrashBin.append(tagButtonTrashBin.append(tagImgTrashBin));
				tagSpanPencil.append(tagButtonPencil.append(tagImgPencil));

				tagDivMain.append(tagSpanTrashBin);
				tagDivMain.append(tagSpanPencil);
			}
		} // --- end like, comment, edit, delete buttons

	};

	var	GetHrefAttrFromSrcObj = function(jsonMessage)
	{
		var 	result;

		result	=	jsonMessage.srcObj.type == "user" ? "/userprofile/" + jsonMessage.srcObj.id + "?rand=" + system_calls.GetUUID() :
					jsonMessage.srcObj.type == "company" ? "/company/" + jsonMessage.srcObj.link + "?rand=" + system_calls.GetUUID() : 
					jsonMessage.srcObj.type == "group" ? "/group/" + jsonMessage.srcObj.link + "?rand=" + system_calls.GetUUID() : "";

		return result;
	};

	var	GetHrefAttrFromDstObj = function(jsonMessage)
	{
		var 	result;

		result	=	jsonMessage.dstObj.type == "user" ? "/userprofile/" + jsonMessage.dstObj.id + "?rand=" + system_calls.GetUUID():
					jsonMessage.dstObj.type == "company" ? "/company/" + jsonMessage.dstObj.link + "?rand=" + system_calls.GetUUID() : 
					jsonMessage.dstObj.type == "group" ? "/group/" + jsonMessage.dstObj.link + "?rand=" + system_calls.GetUUID() : "";

		return result;
	};

	var	isMessageValidToDisplay = function(jsonMessage)
	{
		var		result = true;

		if(jsonMessage.actionTypesId == "12")
		{
			if((jsonMessage.srcObj.type == "user") && (jsonMessage.srcObj.id == myProfile.id))
			{
				// --- demonstrate popular year old message only in user feed
				// --- (not in a feeds of his/her friends)
			}
			else
			{
				result = false;
			}
		}

		return result;
	};

	var BuildNewsFeedSingleBlock = function(item)
	{
		var 	divContainer, divRow, divPhoto, hrefSrcObj, tagImg3, tagDivMessage, hrefUsername, spanTimestamp, canvasSrcObj;
		var		tagDivMsgInfo;
		var		canvasCtx; 				// --- used for transfer arg to function HandlerDrawPicture Avatar
		var		jsonMessage = item;

		divContainer 	= $("<div/>").addClass("container");
		divRow 			= $("<div/>").addClass("row");
		// divRow 			= $("<div/>").addClass("row container");
		divPhoto 		= $("<div/>").addClass("col-lg-1 col-md-1 col-sm-2 col-xs-3 news_feed_photo_block");
		tagDivMsgInfo 	= $("<div/>").addClass("col-lg-10 col-md-10 col-sm-10 col-xs-9 shift_down");
		hrefSrcObj   	= $("<a>");
		canvasSrcObj	= $("<canvas>").attr("width", "160")
										.attr("height", "160");
		tagDivMessage 	= $("<div/>").addClass("col-lg-10 col-md-10 col-sm-12 col-xs-12 single_block box-shadow--6dp");
		hrefUsername   	= $("<a>");
		spanTimestamp	= $("<div>").addClass("news_feed_timestamp")
									.addClass("cursor_pointer")
									.attr("data-toggle", "tooltip")
									.attr("data-placement", "top")
									.attr("title", system_calls.GetLocalizedDateFromDelta(parseFloat(jsonMessage.eventTimestampDelta)))
									.append(system_calls.GetLocalizedDateInHumanFormatMsecSinceEvent(parseFloat(jsonMessage.eventTimestampDelta) * 1000));

		divContainer.append(divRow); 
		divRow	.append(divPhoto)
				.append(tagDivMsgInfo);
		divPhoto.append(hrefSrcObj);
		hrefSrcObj.append(tagImg3);
		hrefSrcObj.append(canvasSrcObj);
		tagDivMsgInfo.append(hrefUsername)
					.append(spanTimestamp);
		tagDivMsgInfo.append(" " + system_calls.GetGenderedActionCategoryTitle(jsonMessage) + "<br>");

		// --- Draw the text avatar initials after adding Context to DOM model
		canvasCtx = canvasSrcObj[0].getContext("2d");
		if((typeof(jsonMessage.dstObj) == "object") && (typeof(jsonMessage.dstObj.type) == "string") && (jsonMessage.dstObj.type == "group"))
		{
			canvasSrcObj.addClass("canvas-big-avatar-corners");
			DrawCompanyAvatar(canvasCtx, jsonMessage.dstObj.avatar, jsonMessage.dstObj.name, jsonMessage.dstObj.nameLast);

			hrefUsername.append(jsonMessage.dstObj.name + " " + jsonMessage.dstObj.nameLast)
						.attr("href", GetHrefAttrFromDstObj(jsonMessage));
			hrefSrcObj	.attr("href", GetHrefAttrFromDstObj(jsonMessage));
		}
		else if(jsonMessage.srcObj.type == "company")
		{
			canvasSrcObj.addClass("canvas-big-avatar-corners");
			DrawCompanyAvatar(canvasCtx, jsonMessage.srcObj.avatar, jsonMessage.srcObj.name, jsonMessage.srcObj.nameLast);

			hrefUsername.append(jsonMessage.srcObj.companyType + " " + jsonMessage.srcObj.name + " " + jsonMessage.srcObj.nameLast)
						.attr("href", GetHrefAttrFromSrcObj(jsonMessage));
			hrefSrcObj	.attr("href", GetHrefAttrFromSrcObj(jsonMessage));
		}
		else
		{
			canvasSrcObj.addClass("canvas-big-avatar");
			DrawUserAvatar(canvasCtx, jsonMessage.srcObj.avatar, jsonMessage.srcObj.name, jsonMessage.srcObj.nameLast);

			hrefUsername.append(jsonMessage.srcObj.name + " " + jsonMessage.srcObj.nameLast)
						.attr("href", GetHrefAttrFromSrcObj(jsonMessage));
			hrefSrcObj	.attr("href", GetHrefAttrFromSrcObj(jsonMessage));
		}

		// --- message types parsing
		// if(jsonMessage.actionTypesId == "11")
		if((jsonMessage.actionTypesId == "11") || (jsonMessage.actionTypesId == "12"))
		{
			// --- 11 message written

			divRow.append(tagDivMessage);
			RenderMessageBody(jsonMessage, tagDivMessage);
		} // --- end of message generation
		else if((jsonMessage.actionTypesId == "14") || (jsonMessage.actionTypesId == "16") || (jsonMessage.actionTypesId == "15"))
		{
			// --- 14 friendship established
			// --- 15 friendship broken
			// --- 16 friendship request sent

			var	tagFriendLink = $("<a>").attr("href", "/userprofile/" + jsonMessage.friendID);

			tagFriendLink.append(jsonMessage.friendName + " " + jsonMessage.friendNameLast);

			tagDivMsgInfo.empty();
			tagDivMsgInfo.append(spanTimestamp);
			tagDivMsgInfo.append(hrefUsername);
			tagDivMsgInfo.append(" " + system_calls.GetGenderedActionCategoryTitle(jsonMessage) + " ")
				.append(tagFriendLink);

			var infoAboutFriend = BuildFriendBlock(jsonMessage);
			divRow.append(tagDivMessage);
			tagDivMessage.append(infoAboutFriend);
		}
		else if(jsonMessage.actionTypesId === "41")
		{
			// --- skill added

			var		message = "";
			var		skillLink = $("<a>").attr("href", "/userprofile/" + jsonMessage.srcObj.id + "?scrollto=SkillPathHeader&rand=" + system_calls.GetUUID()).append("подтвердите");

			message = system_calls.GetGenderedPhrase(jsonMessage, jsonMessage.actionTypesTitle, jsonMessage.actionTypesTitleMale, jsonMessage.actionTypesTitleFemale);
			message += " <i>" + jsonMessage.skillTitle + "</i>, ";

			tagDivMsgInfo.append(message)
						.append(skillLink)
						.append(" если вы согласны");
		}
		else if((jsonMessage.actionTypesId === "54") || (jsonMessage.actionTypesId === "53"))
		{
			// --- book read

			// --- hide subtitle to save some space
			// tagDivMsgInfo.append(jsonMessage.actionTypesTitle);
			divRow.append(tagDivMessage);
			RenderBookBody(jsonMessage, tagDivMessage);
		}
		else if((jsonMessage.actionTypesId === "64") || (jsonMessage.actionTypesId === "65"))
		{
			// --- create / subscribe group

			// --- hide subtitle to save some space
			// tagDivMsgInfo.append(jsonMessage.actionTypesTitle);
			divRow.append(tagDivMessage);
			RenderGroupBody(jsonMessage, tagDivMessage);
		}
		else if(jsonMessage.actionTypesId === "63")
		{
			// --- create / subscribe group

			// --- hide subtitle to save some space
			// tagDivMsgInfo.append(jsonMessage.actionTypesTitle);
			divRow.append(tagDivMessage);
			RenderCompanySubscriptionBody(jsonMessage, tagDivMessage);
		}
		else if(jsonMessage.actionTypesId === "22")
		{
			// --- became certified

			// --- hide subtitle to save some space
			// tagDivMsgInfo.append(jsonMessage.actionTypesTitle);
			divRow.append(tagDivMessage);
			RenderCertificationBody(jsonMessage, tagDivMessage);
		}
		else if((jsonMessage.actionTypesId === "23") || (jsonMessage.actionTypesId === "57"))
		{
			// --- course attending

			// --- hide subtitle to save some space
			// tagDivMsgInfo.append(jsonMessage.actionTypesTitle);
			divRow.append(tagDivMessage);
			RenderCourseBody(jsonMessage, tagDivMessage);
		}
		else if(jsonMessage.actionTypesId === "39")
		{
			// --- got science degree

			// --- hide subtitle to save some space
			// tagDivMsgInfo.append(jsonMessage.actionTypesTitle);
			divRow.append(tagDivMessage);
			RenderScienceDegreeBody(jsonMessage, tagDivMessage);
		}
		else if(jsonMessage.actionTypesId === "40")
		{
			// --- language improved

			// --- hide subtitle to save some space
			// tagDivMsgInfo.append(jsonMessage.actionTypesTitle);
			divRow.append(tagDivMessage);
			RenderLanguageBody(jsonMessage, tagDivMessage);
		}
		else if(jsonMessage.actionTypesId === "1")
		{
			// --- change employment

			// --- hide subtitle to save some space
			// tagDivMsgInfo.append(jsonMessage.actionTypesTitle);
			divRow.append(tagDivMessage);
			RenderCompanyBody(jsonMessage, tagDivMessage);
		}
		else
		{
			tagDivMsgInfo.append(system_calls.GetGenderedPhrase(jsonMessage, jsonMessage.actionTypesTitle, jsonMessage.actionTypesTitleMale,  jsonMessage.actionTypesTitleFemale));
		}

		if(isMessageValidToDisplay(jsonMessage))
		{
			$("#news_feed").append(divContainer);
			spanTimestamp.tooltip({ animation: "animated bounceIn"});
		}
	};

	// --- return freq could be NaN if message array is empty
	var GetMessageFrequency = function(messages)
	{
		var		total_sum = 0;
		var		messages_timestamp_diff = [];
		var		i;
		var		temp;

		messages_timestamp_diff.push(0);

		for(i = 1; i < messages.length; ++i)
		{
			temp = parseInt(messages[i].eventTimestampDelta) - parseInt(messages[i-1].eventTimestampDelta);
			messages_timestamp_diff.push(temp);
			total_sum += temp;
		}

		return total_sum / messages_timestamp_diff.length;
	};

	var FrequencyStatistics_GetDOM = function(messages)
	{
		var	message_frequency_per_sec	= GetMessageFrequency(messages);
		var	period						= ["минуту","час","день","неделю","месяц"];
		var	period_duration				= [60,60*60,60*60*24,60*60*24*7,60*60*24*30];
		var	relative_freq				= 0;
		var	result						= "реже 1 сообщения в месяц";

		for (var i = 0; i < period_duration.length; ++i)
		{
			relative_freq = period_duration[i] / message_frequency_per_sec;

			if(isFinite(relative_freq) && relative_freq > 1)
			{
				result = Math.round(relative_freq) + " сообщен(ий/ия) в " + period[i];
				break;
			}
		}

		return result;
	};

	var RenderExtraParameters = function(messages)
	{
		if($("#post_frequency").text().length === 0)
			$("#post_frequency").append(FrequencyStatistics_GetDOM(messages));
	};

	var BuildNewsFeed = function(data) 
	{
		if(data.length === 0)
		{
			// reduce counter
			--globalPageCounter;

			console.debug("reduce page# due to request returns empty result");
		}
		else
		{
			data.forEach(BuildNewsFeedSingleBlock);
		}

		setTimeout(LazyImageLoad, 1000);
	};

	var	ScrollToElementID = function(elementID)
	{
		if((elementID.length > 1) && $(elementID).length) // --- elementID is "#XXXX"
			system_calls.ScrollWindowToElementID(elementID);
	};

	var	GetNewsFeedFromServer = function(cleanBeforeUpdate, scrollToElementID)
	{
		var		cgiScript, action;
		var		cgiParams = {};

		scrollLock = true;

		if($("#news_feed").data("action") == "news_feed")
		{
			cgiScript = "index.cgi";
			action = "AJAX_getNewsFeed";
			cgiParams = {page: globalPageCounter};
		}
		else if($("#news_feed").data("action") == "getUserWall")
		{
			cgiScript = "index.cgi"; 
			action = "AJAX_getUserWall"; 
			cgiParams = {page: globalPageCounter, id: $("#news_feed").data("id"), login: $("#news_feed").data("login")};
		}
		else if($("#news_feed").data("action") == "getGroupWall")
		{
			cgiScript = "group.cgi"; 
			action = "AJAX_getGroupWall"; 
			cgiParams = {page: globalPageCounter, link: $("#news_feed").data("link")};
		}
		else if($("#news_feed").data("action") == "getCompanyWall")
		{
			cgiScript = "company.cgi"; 
			action = "AJAX_getCompanyWall"; 
			cgiParams = {page: globalPageCounter, link: $("#news_feed").data("link")};
		}
		else if($("#news_feed").data("action") == "view_company_profile")
		{
			cgiScript = "company.cgi"; 
			action = "AJAX_getCompanyWall"; 
			cgiParams = {page: globalPageCounter, link: $("#news_feed").data("link")};
		}

		if(action.length && cgiScript.length)
		{
			$.getJSON("/cgi-bin/" + cgiScript + "?action=" + action, cgiParams)
				.done(function(data) {
					if(data.result == "success")
					{
						if(cleanBeforeUpdate)
						{
							globalNewsFeed = [];
							$("#news_feed").empty();
						}
						globalMyCompanies = data.my_companies || [];
						globalNewsFeed = globalNewsFeed.concat(data.feed);

						RenderExtraParameters(data.feed);

						BuildNewsFeed(data.feed);
						scrollLock = false;

						// --- scroll required just in case updating
						// --- no need to scroll, during surfing
						if(cleanBeforeUpdate)
							ScrollToElementID(scrollToElementID);
					}
					else
					{
						console.error("ERROR: JSON returned error status (" + data.description + ")");
						if(data.description == "re-login required") window.location.href = data.link;
					}
				})
				.fail(function() {
					console.error("ERROR: parsing JSON response from server");
				});
		}
		else
		{
			console.error("ERROR: action[" + action + "] or cgiScript[" + cgiScript + "] is empty");
		}
	};

	var	ZeroizeThenUpdateNewsFeedThenScrollTo = function(scrollToElementID)
	{
		globalPageCounter = 0;
		GetNewsFeedFromServer(true, scrollToElementID);
	};

	var HandlerScrollToShow = function() 
	{
		var		windowPosition	= $(window).scrollTop();
		var		clientHeight	= document.documentElement.clientHeight;
		var		divPosition		= $("#scrollerToShow").position().top;

		if(((windowPosition + clientHeight) > divPosition) && (!scrollLock))
		{
			// --- AJAX get news_feed from the server 
			globalPageCounter += 1;

			GetNewsFeedFromServer(false, "");
		}

		carousel_tools.PlayVisibleCarousels();
/*
		// console.debug("defining position of each carousel");
		$("div.carousel.slide[data-ride='carousel']").each(
			function()
			{
				var		tag = $(this);
				// console.debug("carousel id [" + tag.attr('id') + "] top position is " + tag.offset().top + " compare to " + windowPosition + " - " + (windowPosition + clientHeight));
				if(system_calls.isTagFullyVisibleInWindowByHeight(tag))
					tag.carousel("cycle");
				else
					tag.carousel("pause");
			});
		// console.debug("defining position of each carousel");
		$("div video.videoPlacement").each(
			function()
			{
				var		tag = $(this);
				// console.debug("tag id [" + tag.attr('id') + "] top position is " + tag.offset().top + " compare to " + windowPosition + " - " + (windowPosition + clientHeight));
				if(system_calls.isTagFullyVisibleInWindowByHeight(tag))
				{
					var		playedAttempts = parseInt(tag.attr("data_played_attempts"));
					if(playedAttempts == 0)
					{
						tag.attr("data_played_attempts", playedAttempts + 1);
						tag.get(0).play();
					}
				}
				else
					tag.get(0).pause();
			});
*/
	};

	var ZeroizeNewMessageModal = function()
	{
		var	modal_tag = $("#NewsFeedNewMessage");

		modal_tag.find(".__title")				.val("");
		modal_tag.find(".__text")				.val("");
		modal_tag.find(".__link")				.val("");
		modal_tag.find(".__get_from_link")		.attr("disabled", "");
		$("[name=newsFeedAccessRights]:eq(0)")	.prop("checked", true);
	};


	var	CheckModalValidity = function(modal_tag)
	{
		var	title			= modal_tag.find(".__title").val();
		var	link			= modal_tag.find(".__link").val();
		var	text			= modal_tag.find(".__text").val();
		var	images			= modal_tag.find(".__media_preview_area").html();
		var	lenghtyWord;
		var	error_message	= "";

		if((title.length || text.length || images.length) === 0)
		{
			error_message = "Невозможно написать пустое сообщение";
			system_calls.PopoverError(modal_tag.find(".__title"), error_message);
		}
		else if(system_calls.LongestWordSize(title) > 37) // четырёхсотпятидесятисемимиллиметровое
		{
			lenghtyWord = system_calls.LongestWord(title);

			modal_tag.find(".__title").selectRange(title.search(lenghtyWord), title.search(lenghtyWord) + lenghtyWord.length);

			error_message = "Слишком длинное слово: " + lenghtyWord;
			system_calls.PopoverError(modal_tag.find(".__title"), error_message);
		}
		else if(system_calls.LongestWordSize(text) > 37) // четырёхсотпятидесятисемимиллиметровое
		{
			lenghtyWord = system_calls.LongestWord(text);

			modal_tag.find(".__text").selectRange(text.search(lenghtyWord), text.search(lenghtyWord) + lenghtyWord.length);

			error_message = "Слишком длинное слово: " + lenghtyWord;
			system_calls.PopoverError(modal_tag.find(".__text"), error_message);
		}
		else if(link.length && system_calls.isValidURL(link).length)
		{
			error_message = system_calls.isValidURL(link);
			system_calls.PopoverError(modal_tag.find(".__link"), error_message);
		}
		else if(link.length && !title.length)
		{
			error_message = "Заголовок обязателен";
			system_calls.PopoverError(modal_tag.find(".__title"), error_message);
		}

		return error_message;
	};

	var	__MessageSubmitToServer = function(modal_tag, data)
	{
		modal_tag.find(".__submit").button("loading");

		$.ajax({
				url: "/cgi-bin/index.cgi", 
				type: "POST",
				dataType: "json",
				cache: false,
				data: data
				})
				.done(function(data) 
				{
					console.debug("success(): status - " + data.result);

					if(data.result == "error") 
					{
						system_calls.PopoverError(modal_tag.find(".__message_dst"), data.description);
					}				
					else if(data.result == "success") 
					{
						ZeroizeNewMessageModal();
						ZeroizeThenUpdateNewsFeedThenScrollTo("");

						modal_tag.modal("hide");
					}
					else
					{
						system_calls.PopoverError(modal_tag.find(".__message_dst"), "ошибка ответа сервера");
					}		
				})
				.fail( function()
				{
					system_calls.PopoverError(modal_tag.find(".__message_dst"), "ошибка ответа сервера");
				})
				.always(function() 
				{
					modal_tag.find(".__submit").button("reset");
				});

	};

	var	NewsFeedPostMessage_ClickHandler = function(e) 
	{
		var	submit_button	= $(e.target);
		var	modal_tag		= submit_button.closest(".modal");
		var	error_message	= CheckModalValidity(modal_tag);

		if(error_message.length)
		{
			system_calls.PopoverError(modal_tag.find(".__submit"), error_message);
		}
		else
		{
			var data =
					{
						action:							"AJAX_postNewsFeedMessage",
						newsFeedMessageDstType:			$("#news_feed").data("dsttype"),
						newsFeedMessageDstID:			$("#news_feed").data("dstid"),
						newsFeedMessageSrcType:			$("#srcEntity option:selected").data("srcType"),
						newsFeedMessageSrcID:			$("#srcEntity option:selected").data("srcID"),
						newsFeedMessageTitle:			modal_tag.find(".__title").val(),
						newsFeedMessageLink:			modal_tag.find(".__link").val(),
						newsFeedMessageText:			modal_tag.find(".__text").val(),
						newsFeedMessageRights:			modal_tag.find(".__access_rights").find("input:checked").val(),
						newsFeedMessageImageTempSet:	imageTempSet,
						random:							system_calls.GetUUID()
					};

			__MessageSubmitToServer(modal_tag, data);

		}

	};

	var	GetCompanyName = function(companyID, companies)
	{
		var		result = "";

		if(typeof(companies) != "undefined")
		{
			companies.forEach(function(item) {
				if(item.id == companyID) result = (item.type + " " + item.name).trim();
			});
		}

		return result;
	};

	// --- clean-up picture uploads environment
	var NewMessageNewsFeedModal_ShownHandler = function(e)
	{
		var modal_tag = $(e.target);
		
		// --- globalUploadImageCounter used for disabling "Post" button during uploading images
		globalUploadImageCounter = 0;
		globalUploadImageTotal = 0;

		// TODO: 2delete: debug function to check upload functionality
		globalUploadImage_UnloadedList = [];
		Update_PostMessage_ListUnloaded(globalUploadImage_UnloadedList);

		modal_tag.find(".__submit").text("Написать");

		// --- clean-up preview pictures in PostMessage modal window 
		modal_tag.find(".__media_preview_area").empty();
		globalPostMessageImageList = [];

		// --- set access rights to default value "public"
		modal_tag.find(".__access_rights").find("[value=\"public\"]").prop("checked", true);

		// --- set progress bar to 0 length
		modal_tag.find(".__progress").find(".progress-bar").css("width", "0%");

		// --- set var imageTempSet to random
		imageTempSet = Math.floor(Math.random()*99999999);
		modal_tag.find(".__file_upload").fileupload({formData: {imageTempSet: imageTempSet}});

		// --- zeroize tempSet for user at image_news table
		$.getJSON("/cgi-bin/index.cgi?action=AJAX_prepareFeedImages", {param1: ""})
				.done(function(data) {
					if(data.result == "success")
					{
						var		action = $("#news_feed").data("action");

						// --- if user is administering companies build new select box for company news
						myCompanies = data.companies;
						modal_tag.find(".__message_src")	.empty()
															.append("<label for=\"newsFeedMessageSrc\">Написать от имени:</label>")
															.append(RenderSelectBoxWithUserAndCompanies(myProfile, myCompanies));

						if(action == "getGroupWall")
						{
							modal_tag.find(".__message_src").hide(300);
							modal_tag.find(".__access_rights").hide(300);
						}
						else if((action == "getCompanyWall") || (action == "view_company_profile"))
						{
							modal_tag.find(".__message_src").hide(300);
							modal_tag.find(".__access_rights").hide(300);
							$("#srcEntity").val(GetCompanyName($("#news_feed").data("id"), data.companies));
						}
						else if(myCompanies.length)
							modal_tag.find(".__message_src").show(300);
						else
							modal_tag.find(".__message_src").hide(300);
					}
					else if(data.result == "error")
					{
						console.error("ERROR: " + data.description);
						if((data.description == "re-login required") && (data.location.length))
						{
							window.location.href = data.location;
						}

					}
					else
					{
						console.error("ERROR: unknown status returned from server");
					}
				})
				.fail(function() {
					console.error("ERROR: parsing JSON response from server");
				});

		// --- enable all field for safety reason, just in case they were disabled earlier
		NewMessageModalResetLayout();

		// --- activate noSleep feature to avoid screen dimming during upload
		if(isMobile.phone) NoSleep_global.enable();
	};

	var	RenderSelectBoxWithUserAndCompanies = function(user, companies)
	{
		var		result_tag = $("<select>", {id:"srcEntity", class:"form-control"});

		result_tag.append($("<option>").append(user.firstName + " " + user.lastName).data("srcID", user.id).data("srcType", "user"));
		companies.forEach(function(item) 
		{
			result_tag.append($("<option>").append((item.type + " " + item.name).trim()).data("srcID", item.id).data("srcType", "company"));
		});

		return result_tag;
	};


	var SelectOptionAccordingToDstObj = function(hosting_tag, message)
	{
		return hosting_tag.find("select").find("[data-dst_type=\"" + (message.dstObj.type || "") + "\"][data-dst_id=\"" + (message.dstObj.id || "0") + "\"]").prop("selected", true);
	};

	var	RenderSelectBoxWithUserAndGroups = function(user, append_to, message)
	{
		var	content = append_to.html();

		if(content.length === 0)
		{
			$.getJSON("/cgi-bin/anyrole_1.cgi?action=AJAX_getGroupsOwnedByUserAndSubscribedTo", {param1: ""})
					.done(function(data) {
						if(data.result == "success")
						{
							// --- build select-tag
							var		select_tag = $("<select>", {class:"form-control"});

							select_tag.append($("<option>").append("мою ленту").attr("data-dst_id", "0").attr("data-dst_type", ""));
							data.groups.forEach(function(item) 
							{
								select_tag.append($("<option>").append("Группа: " + item.title).attr("data-dst_id", item.id).attr("data-dst_type", "group"));
							});
					
							// --- select proper option in select tag

							append_to
									.append($("<div>").append("Переместить в:"))
									.append(select_tag);

							SelectOptionAccordingToDstObj(append_to, message);
						}
						else if(data.result == "error")
						{
							system_calls.PopoverError(append_to, "ERROR: " + data.description);
						}
						else
						{
							system_calls.PopoverError(append_to, "ERROR: unknown status returned from server");
						}
					})
					.fail(function() {
						system_calls.PopoverError(append_to, "ERROR: parsing JSON response from server");
					});
		}
		else
		{
			SelectOptionAccordingToDstObj(append_to, message);
		}

	};

	// --- clean-up picture uploads environment
	var MessageModal_HiddenHandler = function(e)
	{
		var	modal_tag = $(e.currentTarget);

		// --- clean-up preview pictures in PostMessage modal window 
		modal_tag.find(".__media_preview_area").empty();
		globalPostMessageImageList = [];

		// --- set progress bar to 0 length
		modal_tag.find(".__progress .progress-bar").css("width", "0%");

		// --- clean-up error message
		modal_tag.find(".__alert").empty().removeClass();

		// --- cleanup picture list from the posted message
		$.getJSON("/cgi-bin/index.cgi?action=AJAX_cleanupFeedImages", {imageTempSet: imageTempSet})
				.done(function(data) {
					console.debug("result = " + data.result);
				});


		// --- set var imageSet to NULL
		imageTempSet = "";
		modal_tag.find(".__file_upload").fileupload({formData: {imageTempSet: imageTempSet}});

		// --- deactivate noSleep feature, reverse back to normal behavior
		if(isMobile.phone) NoSleep_global.disable();
	};

	// TODO: 2delete: debug function to check upload functionality
	var Update_PostMessage_ListUnloaded = function(arr2show)
	{
		$(".PostMessage_ListUnloaded").text( arr2show.join(" , "));
	};

	return {
		Init:Init
			};

})();
