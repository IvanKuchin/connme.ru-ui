// --- change it in (chat.js, common.js, localy.h)
var FREQUENCY_ECHO_REQUEST = 60;
var WS_RECONNECT_TIMEOUT = 60 * 1000;

var	chat = chat || {};

chat = (function()
{
	"use strict";

	var		IMAGE_CHAT_DIRECTORY = "/images/chat/";
	var		CHAT_MAX_IMAGE_SIZE = 524228;
	var		SESSION_LEN = 60;
	var		myUserID = "";
	var		activeUserID = "";
	var		contactList = [];
	var		messageList = [];
	var		activeUserMessages = [];
	var		wsStatus = "disconnected";
	var		ws;
	var		lastKeypressTimestamp = 0;
	var		originalLoadingText; // --- used for temporarily store "data-loading-text" during reconnect event
	var		onScreenKeyboardDisplay;
	var		loadingModalState;
	var		typingIndicatorState = "toolbar";

	var		emojiListHTML = "";
	var		emojiArray = [
{unicode1:55357, unicode2:56832,  shortcut: ":)",   shownOnMenu:"yes", image:"/images/pages/common/smiley_happy.png"},
{unicode1:55357, unicode2:56841,  shortcut: ";)",   shownOnMenu:"yes", image:"/images/pages/common/smiley_wink.png"},
{unicode1:55357, unicode2:56842,  shortcut: "^^",   shownOnMenu:"yes", image:"/images/pages/common/smiley_happyface.png"},
{unicode1:55357, unicode2:56843,  shortcut: ":-P",  shownOnMenu:"yes", image:"/images/pages/common/smiley_goofy.png"},
{unicode1:55357, unicode2:56845,  shortcut: "^Ж^",  shownOnMenu:"yes", image:"/images/pages/common/smiley_hearteyes.png"},
{unicode1:55357, unicode2:56846,  shortcut: "8-)",  shownOnMenu:"yes", image:"/images/pages/common/smiley_sunglasses.png"},
{unicode1:55357, unicode2:56855,  shortcut: ":-*",  shownOnMenu:"yes", image:"/images/pages/common/smiley_blowingkiss.png"},
{unicode1:55357, unicode2:56856,  shortcut: ":-*",  shownOnMenu:"no",  image:"/images/pages/common/smiley_blowingkiss.png"},
{unicode1:55357, unicode2:56857,  shortcut: ":-*",  shownOnMenu:"no",  image:"/images/pages/common/smiley_blowingkiss.png"},
{unicode1:55357, unicode2:56858,  shortcut: ":-*",  shownOnMenu:"no",  image:"/images/pages/common/smiley_blowingkiss.png"},
{unicode1:55358, unicode2:56596,  shortcut: "O_o",  shownOnMenu:"yes", image:"/images/pages/common/smiley_thinker.png"},
{unicode1:55357, unicode2:56866,  shortcut: ":'(",  shownOnMenu:"yes", image:"/images/pages/common/smiley_crying.png"},
{unicode1:55358, unicode2:56592,  shortcut: ":-X",  shownOnMenu:"yes", image:"/images/pages/common/smiley_lipssealed.png"},
{unicode1:55357, unicode2:56859,  shortcut: ":P",   shownOnMenu:"yes", image:"/images/pages/common/smiley_tongue-out.png"},
{unicode1:55357, unicode2:56897,  shortcut: ":(",   shownOnMenu:"yes", image:"/images/pages/common/smiley_frowning.png"},
{unicode1:55357, unicode2:56882,  shortcut: "8-O",  shownOnMenu:"yes", image:"/images/pages/common/smiley_astonishedface.png"},
{unicode1:55357, unicode2:56863,  shortcut: ":-/",  shownOnMenu:"yes", image:"/images/pages/common/smiley_slightlysad.png"},
{unicode1:55357, unicode2:56854,  shortcut: ":-[",  shownOnMenu:"yes", image:"/images/pages/common/smiley_quiveringmouth.png"},
{unicode1:55357, unicode2:56862,  shortcut: ":-e",  shownOnMenu:"yes", image:"/images/pages/common/smiley_disappointedface.png"},
{unicode1:55357, unicode2:56877,  shortcut: ":''(", shownOnMenu:"yes", image:"/images/pages/common/smiley_bawling.png"},
{unicode1:55357, unicode2:56865,  shortcut: ":D-:", shownOnMenu:"yes", image:"/images/pages/common/smiley_poutingface.png"},
{unicode1:55357, unicode2:56864,  shortcut: ":-E",  shownOnMenu:"yes", image:"/images/pages/common/smiley_angryface.png"},
{unicode1:55358, unicode2:56594,  shortcut: ":-'I", shownOnMenu:"yes", image:"/images/pages/common/smiley_sick.png"},
{unicode1:55358, unicode2:56593,  shortcut: ":$",   shownOnMenu:"yes", image:"/images/pages/common/smiley_dollarsigneyes.png"},
{unicode1: 9785, unicode2:65039,  shortcut: "=(",   shownOnMenu:"yes", image:"/images/pages/common/smiley_megafrown.png"},
{unicode1: 9786, unicode2:65039,  shortcut: "^_^",  shownOnMenu:"yes", image:"/images/pages/common/smiley_grinningface.png"}
						];

	// --- scrollLock used to avoid requesting to much data from server during single scrolling
	var		scrollLock = false; 

	var escapable = /[\x00-\x1f\ud800-\udfff\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufff0-\uffff]/g;
/*
	function filterUnicode(quoted){

	  escapable.lastIndex = 0;
	  if( !escapable.test(quoted)) return quoted;

	  return quoted.replace( escapable, function(a){
		return '';
	  });
	}
*/
	// --- single time actions
	var	Init = function()
	{

		$("#loadingModal").modal("show");
		loadingModalState = "loading";
		$("#loadingModal").on("shown.bs.modal", function(e) { 
			if(loadingModalState === "requireToHide")
			{
				$("#loadingModal").modal("hide");
				loadingModalState = "hiding";
			}
			else
			{
				loadingModalState = "shown";
			}
		});
		$("#loadingModal").on("hidden.bs.modal", function(e) { 
			loadingModalState = "hidden";
		});



		myUserID = $("#myUserID").data("myuserid");

		// --- Textarea for message input
		// --- 1) Send message on Ctrl+Enter
		// --- 2) MessageTypingIndicator
		$("#messageToSend").keypress(function (e) {
			if((e.ctrlKey && e.keyCode == 10) || (e.ctrlKey && e.keyCode == 13))
			{
				$("#messageToSend").val($("#messageToSend").val() + "\n");
			}
			else if((e.keyCode == 10) || (e.keyCode == 13))
			{
				$("#MessageListSendButton_1").click();
			}
			else if(((e.timeStamp - lastKeypressTimestamp) > 2000) && (wsStatus == "connected"))
			{
				// --- sending typing notification
				// --- Ctrl + Enter = message sending is not considering as a typing activity
				ws.send("{ \"RequestType\":\"MessageTypingNotification\", \"RequestID\":\"" + Math.floor(Math.random() * 1000000000) + "\", \"toID\":\"" + activeUserID + "\" }");
				lastKeypressTimestamp = e.timeStamp;
			}
		});

		// --- On focus on mobile platforms scroll up for screen-keyboard not close textarea
		$("#messageToSend").bind("focus", MessageToSendFocusHandler);
		$("#messageToSend").bind("blur", MessageToSendBlurHandler);

		// $("#MessageListContainer").on("scroll resize lookup", HandlerWindowScroll);
		$("#MessageList").scroll(HandlerWindowScroll);


		// --- ws reconnect every 60 sec in case of disconnecting
		setTimeout(WSRecovery, WS_RECONNECT_TIMEOUT);

		$("#MessageListSendButton_1").on("click", PostMessageToServer);
		$("#MessageListSendButton_2").on("click", PostMessageToServer);

		// --- emoji init
		$("#ControlButtonSmiley").on("click", ShowSmileyMenu);
		BuildEmojiListHTML();
		
		if(window.File && window.FileList && window.FileReader && window.Blob && window.URL)
		{
			// --- image send control buttons
			$("#ControlButtonPhoto").on("click", function(e)
				{
					$("#FileSendButton_1").click();
				});
			$("#FileSendButton_1").on("change", FileSendButtonChangeHandler);
		}
		else
		{
			console.debug("init: ERROR: image sending doesn't support");
			$("#ControlButtonPhoto").addClass("visibility_hidden");
		}
	
		// --- Just for fun , random typing indicator
		if(Math.floor(Math.random() * 100) > 50)
		{
			$("#MessageTyping img").attr("src", "/images/pages/chat/typing.gif");
		}
		else
		{
			$("#MessageTyping img").attr("src", "/images/pages/chat/typing2.gif");
			
		}
	
		WSHandling();
	};

	var HideLoadingWindow = function()
	{
		if(loadingModalState !== "hidden")
		{
			/*clear screen from loading modal*/
			if(loadingModalState === "shown")
			{
				/* modal shown */
				$("#loadingModal").modal("hide");
				loadingModalState = "hiding";
			}
			else if (loadingModalState === "hiding")
			{
				/*just wait*/
			}
			else
			{
				/* modal still loading and has not been shown yet */
				loadingModalState = "requireToHide";
			}
			setTimeout(HideLoadingWindow, 300);
		}
	};

	var PlaySoundReceivedMessage = function()
	{
		$("#SoundReceivedMessage")[0].play();
	};

	var	UpdateLayoutOnScreenKeyboard = function()
	{
		// if(system_calls.isTouchBasedUA())
		if(isMobile.any)
		{
			var		currentState;
			if($("#ChatHeightCorrecter").attr("class") === undefined)
			{
				currentState = false;
			}
			else
			{
			 	currentState = ($("#ChatHeightCorrecter").attr("class").indexOf("_correcter_") < 0 ? false : true);
			}

			if(currentState ^ onScreenKeyboardDisplay)
			{
				if(onScreenKeyboardDisplay)
				{
					console.debug("UpdateLayoutOnScreenKeyboard: show keyboard");
					$("#ChatHeightCorrecter").addClass("message_pane_correcter_portrait");
				}
				else
				{
					console.debug("UpdateLayoutOnScreenKeyboard: hide keyboard");
					$("#ChatHeightCorrecter").removeClass("message_pane_correcter_portrait");
				}
			}
		}
	};

	var MessageToSendFocusHandler = function()
	{
		var d1 = new Date();

		onScreenKeyboardDisplay = true;
		UpdateLayoutOnScreenKeyboard();
	};

	var MessageToSendBlurHandler = function()
	{
		var	d1 = new Date();

		onScreenKeyboardDisplay = false;
		setTimeout(function() 
			{
				UpdateLayoutOnScreenKeyboard();
			}, 200);
	};

	var	WSHandling = function()
	{
		try 
		{
			ws = new WebSocket("wss://" + window.location.hostname + ":7681", "text-message-protocol");

			ws.onopen = function() {
				wsStatus = "connecting";
				$("#messageToSend").attr("placeholder", "Подключение...");

				ws.send("{ \"RequestType\":\"OpenSession\", \"RequestID\":\"" + Math.floor(Math.random() * 1000000000) + "\", \"sessid\":\"" + $.cookie("sessid") + "\" }");
			};


			ws.onclose = function(){
				wsStatus = "disconnected";

				$("#messageToSend").attr("disabled", "disabled");
				$("#messageToSend").attr("placeholder", "Нет подключения к серверу. Подождите 1 минуту.");
				originalLoadingText = $("#MessageListSendButton_1").data("loading-text");
				$("#MessageListSendButton_1").data("loading-text", "1 мин...");
				$("#MessageListSendButton_1").button('loading');

				console.debug("ws.onclose: onclose");
			};

			ws.onmessage = function(event) {
				var		obj = JSON.parse(event.data);

				wsStatus = "connected";
				$("#MessageListSendButton_1").data("loading-text", originalLoadingText);
				$("#messageToSend").attr("placeholder", "Сообщение...");
				$("#messageToSend").removeAttr("disabled");

				if(typeof(obj.RequestType))
				{
					if(obj.RequestType === "SendMessage")
					{
						messageList.push(obj);

						// --- performance mode: update single message status
						/*
						if((typeof(obj.toID) != "undefined") && (obj.toID == myUserID) && (typeof(obj.messageStatus) != "undefined") && (obj.messageStatus == "sent"))
						{
							ChangeMessageStatusOnServer(obj, "delivered");
							ChangeMessageStatusInternally(obj, "delivered");
							obj.messageStatus = "delivered";
						}
						*/
						// --- normal mode: update status of all messages
						UpdateMessageArrayFromSentToDelivered();
						UpdateUnreadMessagesBadge();
						UpdateActiveUserMessagesArray();
						AddSingleMessageToMessageList($("#MessageListContainer"), obj, 1 /*animate*/, 1 /*append*/);
						MessageSendEnableLayout(obj);
					}
					else if(obj.RequestType === "OpenSession")
					{
						if(obj.status == "ok")
						{
							// --- zeroize all data							
							contactList = [];
							messageList = [];
							$("#ContactList").empty();
							$("#MessageListContainer").empty();
							activeUserID = "";

							RequestChatInitialData();
						}
						else
						{
							console.debug("WebSocket.onmessage: ERROR: " + obj.description);
						}
					}
					else if(obj.RequestType === "GetInitialData")
					{
						if(obj.status == "ok")
						{
							contactList = obj.userArray;
							messageList = obj.messageArray;
							UpdateContactList($("#ContactList"));
							window.setTimeout(SendPresenceUpdateRequest, FREQUENCY_ECHO_REQUEST * 1000);

							$("#SendingMessage").hide(500);

							HideLoadingWindow();

							// --- this is long operation in time. Updating all messages directed to user one-by-one
							// --- updates will be sent during CSS-animation
							UpdateMessageArrayFromSentToDelivered();
							UpdateUnreadMessagesBadge();

							if($("#ContactList").data("activeuserid") !== "")
							{
								$("div[data-userid=" + $("#ContactList").data("activeuserid") + "]").trigger("click");
							}
						}
						else
						{
							console.debug("WebSocket.onmessage: GetInitialData: ERROR: " + obj.description);
						}
					}
					else if(obj.RequestType === "GetMessageBlock")
					{
						scrollLock = false;

						if(obj.status == "ok")
						{
							var	friendID = obj.friendID;

							// --- add received messages to messageList
							messageList = messageList.concat(obj.messageArray);

							// --- this is long operation in time. Updating all messages directed to user one-by-one
							// --- updates will be sent during CSS-animation
							UpdateMessageArrayFromSentToDelivered();
							UpdateUnreadMessagesBadge();
							UpdateActiveUserMessagesArray();

							if(activeUserID == obj.friendID)
							{
								// --- update GUI
								obj.messageArray.forEach(function(item, i, arr) {
									AddSingleMessageToMessageList($("#MessageListContainer"), item, 0 /*no animate*/, 0 /*prepend*/);
								});

								// --- scroll to first message from received block
								// ScrollMessageListToMessageID(obj.messageArray[0].id);
							}

						}
						else
						{
							console.debug("WebSocket.onmessage: GetMessageBlock: ERROR: " + obj.description);
						}
					}
					else if(obj.RequestType === "MessageTypingNotification")
					{
						if(obj.status == "ok")
						{
							if(activeUserID == obj.fromID)
							{
								if(typingIndicatorState == "toolbar")
								{
									typingIndicatorState = "typing";
									$("#ControlButtons").addClass("opacity_0");
									setTimeout(function() 
										{
											$("#MessageTyping").addClass("message_pane_div_typing_opacity_05");
										}, 100);

									setTimeout(function() 
										{ 
											$("#MessageTyping").removeClass("message_pane_div_typing_opacity_05"); 
										}, 2000);
									setTimeout(function() 
										{ 
											$("#ControlButtons").removeClass("opacity_0");
											typingIndicatorState = "toolbar";
										}, 2100);
								}
							}

						}
						else
						{
							console.debug("WebSocket.onmessage: MessageTypingNotification: ERROR: " + obj.description);
						}
					}
					else if(obj.RequestType === "ChangeMessageStatus")
					{
						if(obj.status == "ok")
						{
							if(obj.messageStatus == "delivered")
							{
								$("div[data-messageID=" + obj.id + "] div.col-xs-12").removeClass("message_pane_message_sent");
								$("div[data-messageID=" + obj.id + "] div.col-xs-12").addClass("message_pane_message_delivered");
								ChangeMessageStatusInternally(obj, "delivered");
							}
							if(obj.messageStatus == "read")
							{
								$("div[data-messageID=" + obj.id + "] div.col-xs-12").removeClass("message_pane_message_sent");
								$("div[data-messageID=" + obj.id + "] div.col-xs-12").removeClass("message_pane_message_delivered");
								$("div[data-messageID=" + obj.id + "] div.col-xs-12").addClass("message_pane_message_read");
								ChangeMessageStatusInternally(obj, "read");
							}
						}
						else
						{
							console.debug("WebSocket.onmessage: ERROR: " + obj.description);
						}
					}
					else if(obj.RequestType === "PresenceUpdate")
					{
						if(obj.status == "ok")
						{
							obj.presenceCache.forEach(function(item, i, arr)
							{
								var		tmpUserID = (Object.keys(item))[0];
								var		tmpLastonlineSecondSinceY2k = item[tmpUserID];

								var 	y2kDate = 946684800 * 1000; // --- ms till Y2k UTC
								var		nowDate = new Date();
								var		nowSecondsSinceY2k = (nowDate.getTime() - y2kDate) / 1000;

								var		userPresenceStatus = (nowSecondsSinceY2k - tmpLastonlineSecondSinceY2k);

								if(tmpUserID)
								{
									UpdatePresenceIndicator(tmpUserID, (nowSecondsSinceY2k - tmpLastonlineSecondSinceY2k));
								}
								else
								{
									console.debug("PresenceUpdate: ERROR: user not found (item = " + item + ", userID = " + tmpUserID + ")");
								}
							});
						}
						else
						{
							console.debug("WebSocket.onmessage: ERROR: " + obj.description);
						}
					}
					else
					{
						console.debug("WebSocket.onmessage: ERROR: unsupported RequestType: " + obj.RequestType);
					}
				}
				else if(typeof(obj.ResponseType))
				{
					if(obj.ResponseType === "")
					{

					}
					else
					{
						console.debug("WebSocket.onmessage: ERROR: unsupported RequestType: " + obj.RequestType);
					}
				}
				else
				{
					console.debug("WebSocket.onmessage: ERROR: RequestType and ResponseType are missed: " + obj.RequestType);
				}
			};

		} 
		catch(exception) 
		{
			$("#ContactAdministrationButton").attr("data-error", 'Error' + exception);
			$("#ContactAdministrationDialog").modal("show");
		}

	};

	var	WSRecovery = function()
	{
		if(wsStatus == "disconnected")
		{
			WSHandling();
		}
		setTimeout(WSRecovery, WS_RECONNECT_TIMEOUT);
	};

	var	SendPresenceUpdateRequest = function()
	{
		var	tmpUserList = "";

		contactList.forEach(function(item, i, arr)
			{
				tmpUserList += (tmpUserList.length ? "," : "") + item.id;
			});

		if(tmpUserList.length)
		{
			ws.send("{ \"RequestType\":\"PresenceUpdate\", \"RequestID\":\"" + Math.floor(Math.random() * 1000000000) + "\", \"userList\":\"" + tmpUserList + "\" }");
		}

		window.setTimeout(SendPresenceUpdateRequest, FREQUENCY_ECHO_REQUEST * 1000);
	};

	var	ChangeMessageStatusOnServer = function(objMessage, status)
	{
		if((typeof(objMessage.id) != "undefined") && (objMessage.id.length))
		{
			ws.send("{ \"RequestType\":\"ChangeMessageStatus\", \"RequestID\":\"" + (((typeof(objMessage.RequestID) != "undefined") && (objMessage.RequestID.length)) ? objMessage.RequestID : "") + "\", \"id\":\"" + objMessage.id + "\", \"messageStatus\":\"" + status + "\" }");
			UpdateUnreadMessagesBadge();
		}
	};

	var	UpdatePresenceIndicator = function(userID, diffTime)
	{
		if($("div[data-userid=" + userID + "] div.col-xs-12 img").length)
		{
			if(diffTime <= 60)
			{
				// -- user online
				if($("div[data-userid=" + userID + "] div.col-xs-12 img").attr("src").indexOf("online") == -1)
				{
					$("div[data-userid=" + userID + "] div.col-xs-12 img").attr("src", "/images/pages/common/presence_online.png");
				}
			}
			else
			{
				// -- user offline
				if($("div[data-userid=" + userID + "] div.col-xs-12 img").attr("src").indexOf("offline") == -1)
				{
					$("div[data-userid=" + userID + "] div.col-xs-12 img").attr("src", "/images/pages/common/presence_offline.png");
				}
			}
		}
	};

	var	GetPresenceIndicator = function(user)
	{
		var		tmpUserID = user.id;
		var		tmpLastonlineSecondSinceY2k = user.last_onlineSecondsSinceY2k;

		var 	y2kDate = 946684800 * 1000; // --- ms till Y2k UTC
		var		nowDate = new Date();
		var		nowSecondsSinceY2k = (nowDate.getTime() - y2kDate) / 1000;

		var		userPresenceStatus = (nowSecondsSinceY2k - tmpLastonlineSecondSinceY2k);

		return $("<img>").attr("src", "/images/pages/common/" + (user.last_online_diff < FREQUENCY_ECHO_REQUEST ? "presence_online.png" : "presence_offline.png"));
	};

	var	ContactListClickHandler = function()
	{
		if(activeUserID != $(this).attr("data-userid"))
		{
			// --- update Contact list
			$("div[data-userid]").removeClass("contact_list_selected");

			// --- update message list
			activeUserID = $(this).attr("data-userid");
			$(this).addClass("contact_list_selected");

			UpdateMessageList($("#MessageListContainer"), activeUserID);

			// --- Reset Message sending 
			MessageSendResetLayout();

			UpdateUnreadMessagesBadge();
		}
	};

	var	GetNumberUnreadMessagesForUser = function(userID)
	{
		var		countOfUnreadMessages = 0;

		messageList.forEach(function(item, i, arr)
			{
				if((item.fromID === userID) && (item.messageStatus === "delivered"))
				{
					countOfUnreadMessages = countOfUnreadMessages + 1;
				}
			});

		return countOfUnreadMessages;
	};

	var UpdateUnreadMessagesBadge = function()
	{
		contactList.forEach(function(item, i, arr)
			{
				var		user = item;
				var		currentNumberOfUnreadMessages = $("div[data-userid=" + user.id + "] span.numberOfUnreadMessages:first").text();
				var		newNumberOfUnreadMessages = GetNumberUnreadMessagesForUser(user.id);

				if(!newNumberOfUnreadMessages) { newNumberOfUnreadMessages = ""; }

				if(currentNumberOfUnreadMessages != newNumberOfUnreadMessages)
				{
					var		userID = user.id;

					if(newNumberOfUnreadMessages === "")
					{
						$("div[data-userid=" + userID + "] span.numberOfUnreadMessages").addClass("contact_list_name_number_of_unread_messages_badge_invisible");
						$("div[data-userid=" + userID + "] span.numberOfUnreadMessages").text(newNumberOfUnreadMessages);
					}
					else
					{
						$("div[data-userid=" + userID + "] span.numberOfUnreadMessages").removeClass("contact_list_name_number_of_unread_messages_badge_invisible");
						$("div[data-userid=" + userID + "] span.numberOfUnreadMessages").text(newNumberOfUnreadMessages);
						$("div[data-userid=" + userID + "] span.numberOfUnreadMessages").addClass("scale2");
						setTimeout(function() { $("div[data-userid=" + userID + "] span.numberOfUnreadMessages").removeClass("scale2"); }, 400);
						PlaySoundReceivedMessage();
					}

				}
			});
	};

	var	UpdateContactList = function(DOMPlacement)
	{
		var		divContainerFluid = $("<div>").addClass("container-fluid").appendTo(DOMPlacement);

		contactList.forEach(function(item, i, arr)
			{
				var		user = item;
				var		divRow = $("<div>").addClass("row")
											.addClass("contact_list_row")
											.appendTo(divContainerFluid)
											.attr("data-userid", user.id)
											.on("click", ContactListClickHandler);
				var		divAvatar = $("<div>").addClass("col-lg-4 col-md-5 col-sm-5 col-xs-0 hidden-xs contact_list_photo_div")
												.appendTo(divRow);
				var		divName = $("<div>").addClass("col-lg-8 col-md-7 col-sm-7 col-xs-12 padding_0px")
												.appendTo(divRow)
												.attr("draggable", "true");
				var		canvasAvatar	= $("<canvas>")	.attr("width", "40")
														.attr("height", "40")
														.addClass('canvas-big-avatar')
														.addClass('contact_list_avatar')
														.appendTo(divAvatar);
				var		numberOfUnreadMessages = GetNumberUnreadMessagesForUser(user.id);
				if(numberOfUnreadMessages === 0) { numberOfUnreadMessages = ""; }

				DrawUserAvatar(canvasAvatar[0].getContext("2d"), user.avatar, user.name, user.nameLast);
				$(divName).append(GetPresenceIndicator(user))
							.append("&nbsp;" + user.name + " " + user.nameLast + " ");

				// --- adding badge with unread messages
				divAvatar.append($("<span/>").addClass("numberOfUnreadMessages badge badge-danger contact_list_photo_number_of_unread_messages_badge")
						.append(numberOfUnreadMessages));
				divName.append($("<span/>").addClass("numberOfUnreadMessages badge badge-danger visible-xs-inline " + (numberOfUnreadMessages === "" ? "contact_list_name_number_of_unread_messages_badge_invisible" : ""))
						.append(numberOfUnreadMessages));
			});
	};

	var	MessageSendLoadingLayout = function(messageObj)
	{
		$("#MessageListSendButton_1").button('loading');
		$("#MessageListSendButton_2").button('loading');
	};

	var MessageSendResetLayout = function()
	{
		$("#messageToSend").val("")
							.focus();
		$("#MessageListSendButton_1").button('reset');
		$("#MessageListSendButton_2").button('reset');
		$("#MessageTyping").removeClass("message_pane_div_typing_opacity_05");
		$("#ControlButtons").removeClass("opacity_0");
	};

	var	MessageSendEnableLayout = function(messageObj)
	{
		var		myUserID = $("#myUserID").data("myuserid");
		
/*
		if(((messageObj.fromID == activeUserID) && (messageObj.toID == myUserID)) ||
		   ((messageObj.fromID == myUserID) && (messageObj.toID == activeUserID)))
*/
		if((messageObj.fromID == myUserID) && (messageObj.toID == activeUserID))
		{
			MessageSendResetLayout();
		}
	};

	var	GetMessageTimestamp = function(messageObj)
	{
		var		result = "";

		if((typeof(messageObj.secondsSinceY2k) == "string") && (messageObj.secondsSinceY2k.length))
		{
			var y2kDate = 946684800 * 1000; // --- ms till Y2k UTC
			var currDate  = new Date(y2kDate + parseInt(messageObj.secondsSinceY2k) * 1000);
			result = currDate.toLocaleString().replace(/ /, "<br>");	 
		}
		else if((typeof(messageObj.eventTimestamp) == "string") && (messageObj.eventTimestamp.length))
		{
			result = messageObj.eventTimestamp.replace(/ /, "<br>");
		}


		return result;
	};

	var	AddSingleMessageToMessageList = function(DOMPlacement, messageObj, animateFlag, appendFlag)
	{
		var		myUserID = $("#myUserID").data("myuserid");
		var		divRow = $("<div>").addClass("row")
									.addClass("message_pane_intermessage_interval")
									.attr("data-messageID", messageObj.id)
									.hover( function() { $(this).children("div.message_pane_timestamp").removeClass("message_pane_timestamp_white"); }, function() { $(this).children("div.message_pane_timestamp").addClass("message_pane_timestamp_white"); } );
		var		divAvatarFromMe	 	= $("<div>").addClass("col-lg-1 col-md-2 col-sm-2 col-xs-0 hidden-xs");
		var		divAvatarFromFriend 	= $("<div>").addClass("col-lg-1 col-md-2 col-sm-2 col-xs-0 hidden-xs");
		var		divTimestampFromMe		= $("<div>").addClass("col-lg-2 col-md-2 col-sm-2 col-xs-0 hidden-xs message_pane_timestamp message_pane_timestamp_white animateClass message_pane_align_right ")
													.append(GetMessageTimestamp(messageObj));
		var		divTimestampFromFriend	= $("<div>").addClass("col-lg-2 col-md-2 col-sm-2 col-xs-0 hidden-xs message_pane_timestamp message_pane_timestamp_white animateClass ")
													.append(GetMessageTimestamp(messageObj));
		var		divMessageFromMe 	  	= $("<div>").addClass("col-lg-9 col-md-8 col-sm-8 col-xs-12 animateClass box-shadow--3dp message_pane_from_me")
													// .attr("draggable", "true")
													.hover(function() { $(this).addClass("box-shadow--6dp"); }, function() { $(this).removeClass("box-shadow--6dp"); });
		var		divMessageFromFriend	= $("<div>").addClass("col-lg-9 col-md-8 col-sm-8 col-xs-12 animateClass box-shadow--3dp  message_pane_from_friend")
													// .attr("draggable", "true")
													.hover(function() { $(this).addClass("box-shadow--6dp"); }, function() { $(this).removeClass("box-shadow--6dp"); });
		var		canvasAvatarFromMe		= $("<canvas>").attr("width", "40")
													.attr("height", "40")
													.addClass('canvas-big-avatar')
													.addClass('contact_list_avatar')
													.appendTo(divAvatarFromMe);
		var		canvasAvatarFromFriend	=   $("<canvas>").attr("width", "40")
														.attr("height", "40")
														.addClass('canvas-big-avatar')
														.addClass('contact_list_avatar')
														.appendTo(divAvatarFromFriend);
		var		messageText = system_calls.ReplaceTextLinkToURL(ReplaceHTMLSmileySymbolsToImg(messageObj.message));
		var		messageImg = $("<img>").addClass("message_pane_image_resize");
		var		messageType = messageObj.messageType;

		var		messageBody;

		if(messageType == "text")
			messageBody = messageText;
		else if(messageType == "image")
		{
			messageBody = messageImg.attr("src", IMAGE_CHAT_DIRECTORY + messageText)
							.on("load", function() { 
								if(appendFlag) ScrollMessageListToLastMessage(); 
							})
							.on("click", function() {
								$("#imageViewModal_image").attr("src", IMAGE_CHAT_DIRECTORY + messageText);
								$("#ImageViewingModal").modal("show");
							});
		}

		// messageBlock = messageBlock.add(divRow); 
		if((messageObj.fromID == myUserID) && (messageObj.toID == activeUserID))
		{
			// --- "local user" look to chat window with the user message come from him-self

			
			divRow.append(divTimestampFromMe);
			divRow.append(divMessageFromMe);
			divRow.append(divAvatarFromMe);

			divMessageFromMe.append(messageBody);

			if(messageObj.messageStatus == "delivered")
			{
				divMessageFromMe.addClass("message_pane_message_delivered");
			}
			if(messageObj.messageStatus == "unread")
			{
				divMessageFromMe.addClass("message_pane_message_unread");
			}
			if(messageObj.messageStatus == "sent")
			{
				divMessageFromMe.addClass("message_pane_message_sent");
			}
			DrawUserAvatar(canvasAvatarFromMe[0].getContext("2d"), $("#myUserID").data("myuseravatar"), $("#myFirstName").text(), $("#myLastName").text());

			if(appendFlag)
			{
				DOMPlacement.append(divRow);

				if(animateFlag)
				{

					// divMessageFromMe.css("opacity", "0"); 
					divMessageFromMe.css("top", "40px"); 
					divAvatarFromMe.css("opacity", "0"); 
					divAvatarFromMe.css("left", "30px"); 

					// divMessageFromMe.css("right", "-100%"); 
					ScrollMessageListToLastMessage();
					divMessageFromMe.animate({"top":"0px"}, {duration: 500, easing: "linear", 
						complete: function()
						{
							ScrollMessageListToLastMessage();
						} });
					divAvatarFromMe.animate({"opacity":"1"}, {duration: 2000, queue:false, easing: "swing"})
									.animate({"left":"0px"}, {duration: 400, easing: "linear",
						complete: function()
						{
						} });
				}
			}
			else
			{
				var		currScrollTop = $("#MessageList").scrollTop();

				DOMPlacement.prepend(divRow);
				$("#MessageList").scrollTop(currScrollTop + divRow.outerHeight(true));
			}
		}
		if((messageObj.fromID == activeUserID) && (messageObj.toID == myUserID))
		{
			// --- "local user" look chat window with other user than the message sender
			var		friendUser = contactList.filter(function(item)
				{
					return item.id == messageObj.fromID;
				});


			divRow.append(divAvatarFromFriend);
			divRow.append(divMessageFromFriend);
			divRow.append(divTimestampFromFriend);

			divMessageFromFriend.append(messageBody);
			DrawUserAvatar(canvasAvatarFromFriend[0].getContext("2d"), friendUser[0].avatar, friendUser[0].name, friendUser[0].nameLast);

			if(appendFlag)
			{
				DOMPlacement.append(divRow);
	
				if(animateFlag)
				{

					divMessageFromFriend.css("opacity", "0"); 
					divMessageFromFriend.css("top", "-40px"); 
					divAvatarFromFriend.css("opacity", "0"); 
					divAvatarFromFriend.css("left", "-30px"); 
					// divMessageFromMe.css("right", "-100%"); 
					ScrollMessageListToLastMessage();
					divMessageFromFriend.animate({"opacity":"1", "top": "0px"}, {duration: 500, 
						complete: function()
						{
							ScrollMessageListToLastMessage();
						} });
					divAvatarFromFriend.animate({"opacity":"1", "left": "0px"}, {duration: 500, 
						complete: function()
						{
							ScrollMessageListToLastMessage();
						} });

					PlaySoundReceivedMessage();
				}
			}
			else
			{
				var		currScrollTop = $("#MessageList").scrollTop();

				DOMPlacement.prepend(divRow);
				$("#MessageList").scrollTop(currScrollTop + divRow.outerHeight(true));
			}
		}
	};


	var	ScrollMessageListToMessageID = function(messageID)
	{
			if(activeUserMessages.length)
			{
				var	messageOffset 			= $("div[data-messageID=" + messageID + "]").position().top;
				var	messageClientHeight 	= $("div[data-messageID=" + messageID + "]")[0].clientHeight;
				var	messageListScrollTop	= $("#MessageList").scrollTop();
				var	messageListClientHeight	= $("#MessageList")[0].clientHeight;
				var	scrollTop = (messageListScrollTop + 20) + ((messageOffset + messageClientHeight) - (messageListClientHeight));
				
				$("#MessageList").animate({scrollTop: (messageListScrollTop + 20) + ((messageOffset + messageClientHeight) - (messageListClientHeight)) }, 300);
				if(Math.abs(scrollTop - messageListScrollTop) > 10) setTimeout(ScrollMessageListToMessageID, 700, messageID);
			}
	};

	var	ScrollMessageListToLastMessage = function()
	{
		if(activeUserMessages.length)
		{
			ScrollMessageListToMessageID(activeUserMessages[activeUserMessages.length - 1].id);
		}
	};

	var ChangeMessageStatusInternally = function(obj, newStatus)
	{
		messageList.forEach(function(item, i, arr) 
			{
				if((item.id == obj.id) && (item.messageStatus != newStatus))
				{
					item.messageStatus = newStatus;
				}
			});
	};

	var	UpdateActiveUserMessagesArray = function()
	{
		activeUserMessages = messageList.filter(function(item) { return ((item.fromID == activeUserID) || (item.toID == activeUserID)); });
		activeUserMessages = activeUserMessages.sort(function(item1, item2) { return ((parseFloat(item1.id) < parseFloat(item2.id)) ? -1 : 1); });

		activeUserMessages.forEach(function(item, i, arr) 
			{
				if((item.messageStatus != "read") && (item.toID == myUserID))
				{
					ChangeMessageStatusInternally(item, "read");
					ChangeMessageStatusOnServer(item, "read");
					item.messageStatus = "read";
				}
			});
	};

	// --- this function must be called just once during the initial chat build-up
	// --- all messages sent to user will change status to Delivered
	var	UpdateMessageArrayFromSentToDelivered = function()
	{
		messageList.forEach(function(item, i, arr) 
			{
				if((typeof(item.toID) != "undefined") && (item.toID == myUserID) && (typeof(item.messageStatus) != "undefined") && (item.messageStatus == "sent"))
				{
					ChangeMessageStatusInternally(item, "delivered");
					ChangeMessageStatusOnServer(item, "delivered");
					item.messageStatus = "delivered";
				}
			});
	};


	var	UpdateMessageList = function(DOMPlacement)
	{
		// var		myUserID = $("#myUserID").data("myuserid");
		// var		messageBlock = $();


		activeUserMessages = [];
		DOMPlacement.empty();

		if(activeUserID === "")
		{
			$("#SendingMessage").hide(500);
		}
		else
		{

			$("#SendingMessage").show(500);

			UpdateActiveUserMessagesArray();

			activeUserMessages.forEach(function(item, i, arr)
				{
					AddSingleMessageToMessageList(DOMPlacement, item, 0 /*no animate*/, 1 /*append*/);
				});

			//--- block loading "top-messages" until initial "scroll down" complete
			scrollLock = true;
			ScrollMessageListToLastMessage();
			window.setTimeout(function()
				{
					scrollLock = false;
				}, 300);
		}

	};

	var	ReplaceHTMLSmileySymbolsToImg = function(srcText)
	{
		var		resultText = srcText;

		emojiArray.forEach(function(item, i, arr)
		{
			resultText = resultText.replaceAll(item.shortcut, "<img src=\"" + item.image + "\" class=\"height_34px\">");
		});
		
		return resultText;
	}

	var	ReplaceTwoSymbolsToSubstring = function(srcString, pos, subString)
	{
		return "".concat(srcString.substr(0, pos) + subString, srcString.substr(pos+2))
	}

	var	PostMessageToServer = function(event)
	{
		var		btn = $(this);
		var		clearedMessage = $("#messageToSend").val();
		var		tempMessage;
		var		messageRecipient = activeUserID;

/*
		clearedMessage = clearedMessage.replace(/\—/g, "-");
		clearedMessage = clearedMessage.replace(/\№/g, "&Norder;");
		clearedMessage = clearedMessage.replace(/й/g, "&ishort;");
		clearedMessage = clearedMessage.replace(/ё/g, "&euml;");
		clearedMessage = clearedMessage.replace(/з/g, "&zsimple;");
		clearedMessage = clearedMessage.replace(/Й/g, "&Ishort;");
		clearedMessage = clearedMessage.replace(/Ё/g, "&Euml;");
		clearedMessage = clearedMessage.replace(/З/g, "&Zsimple;");
*/
		clearedMessage = clearedMessage.replace(/\\/g, "");
		clearedMessage = clearedMessage.replace(/[\t ]+/g, " ");
		clearedMessage = clearedMessage.replace(/\"/g, "&quot;");
		clearedMessage = clearedMessage.replace(/\</g, "&lt;");
		clearedMessage = clearedMessage.replace(/\>/g, "&gt;");
		clearedMessage = clearedMessage.replace(/^\s*/, "");
		clearedMessage = clearedMessage.replace(/\s*$/, "");
		clearedMessage = clearedMessage.replace(/\n/, "<br>");

		// --- emoji
		for (var i = clearedMessage.length - 1; i >= 0; i--) {
			emojiArray.forEach(function(item)
			{
				if((clearedMessage.charCodeAt(i) == item.unicode1) && (clearedMessage.charCodeAt(i+1) == item.unicode2))
					clearedMessage = ReplaceTwoSymbolsToSubstring(clearedMessage, i, item.shortcut);

			});
			// --- first smiley - grinning face 55357 56832
			// --- last  smiley - passenger ship 55357 56845
			if((clearedMessage.charCodeAt(i) >= 55357) && (clearedMessage.charCodeAt(i) <= 55357) &&
			   (clearedMessage.charCodeAt(i+1) >= 56832) && (clearedMessage.charCodeAt(i+1) <= 56845)) clearedMessage = ReplaceTwoSymbolsToSubstring(clearedMessage, i, "");
		}

		if(clearedMessage.length)
		{
			MessageSendLoadingLayout();
			ws.send("{ \"RequestType\":\"SendMessage\", \"RequestID\":\"" + Math.floor(Math.random() * 1000000000) + "\", \"toType\":\"toUser\", \"toID\":\"" + messageRecipient + "\", \"messageType\":\"text\", \"message\":\"" + clearedMessage + "\" }");
		}
	};

	var RequestChatInitialData = function()
	{
		ws.send("{ \"RequestType\":\"GetInitialData\",\"RequestID\":\"" + Math.floor(Math.random() * 1000000000) + "\",\"ActiveUserID\":\"" + $("#ContactList").data("activeuserid") + "\" }");
	};

	var HandlerWindowScroll = function()
	{
		var		windowPosition	= $(window).scrollTop();
		var		clientHeight	= document.documentElement.clientHeight;
		var		divPosition		= $("#MessageListContainer").position().top;

		if((divPosition > -10) && (! scrollLock))
		{
			var 	minID = 0;

			scrollLock = true;

			for(var item in activeUserMessages)
			{
				if((!minID) || (minID > activeUserMessages[item].id))
				{
					minID = parseFloat(activeUserMessages[item].id);
				}
			}

			ws.send("{ \"RequestType\":\"GetMessageBlock\",\"RequestID\":\"" + Math.floor(Math.random() * 1000000000) + "\",\"friendUser\":\"" + activeUserID + "\",\"minMessageID\":\"" + minID + "\" }");
		}

	};

	var	EmojiClickHandler = function()
	{
		function InsertAtCursor(myField, myValue) {
			//IE support
			if (document.selection) {
				myField.focus();
				sel = document.selection.createRange();
				sel.text = myValue;
			}
			//MOZILLA and others
			else if (myField.selectionStart || myField.selectionStart == '0') {
				var startPos = myField.selectionStart;
				var endPos = myField.selectionEnd;
				myField.value = myField.value.substring(0, startPos)
					+ myValue
					+ myField.value.substring(endPos, myField.value.length);
			} else {
				myField.value += myValue;
			}
		}

		console.debug("shortcut: " + $(this).data("shortcut"));
		$("#ControlButtonSmiley").popover("destroy");
		InsertAtCursor(document.getElementById("messageToSend"), $(this).data("shortcut"));

	}

	var	ShowSmileyMenu = function()
	{

		$("#ControlButtonSmiley").popover({"content": emojiListHTML, "placement":"top", "container":"body", "html":"true"})
								.popover("show");

		$('[data-icon="emoji"]').on("click", EmojiClickHandler);
/*		setTimeout(function () 
			{
				$("#ControlButtonSmiley").popover("destroy");
			}, 30000);
*/
	};

	var	BuildEmojiListHTML = function()
	{
		var		maxEmojiOnSingleLine = 6;
		var		breakLineCounter = 0;

		emojiArray.forEach(function(item, i, arr) 
		{
			if(breakLineCounter && !(breakLineCounter % maxEmojiOnSingleLine)) emojiListHTML += "<br>";

			if(item.shownOnMenu == "yes")
			{
				emojiListHTML += "<img src=\"" + item.image + "\" class=\"height_20px\" data-icon=\"emoji\" data-shortcut=\"" + item.shortcut + "\">&nbsp;";
				breakLineCounter++;
			}
		});
	};

	// --- file sending
	var FileSendButtonChangeHandler = function(input)
	{
		var		messageRecipient = activeUserID;
		var		filesArr = Array.prototype.slice.call(input.target.files);
		filesArr.forEach( function(file, i, arr)
		{
			var		img = new Image();
			var		url = URL.createObjectURL(input.target.files[i]);

			img.onload = function()
			{
				var		ratioW = 640 / img.width, ratioH = 480 / img.height;
				var		minRatio = Math.min(ratioW, ratioH);
				var		canvasWidth = img.width * minRatio, canvasHeight = img.height * minRatio;
				var		canvas = $("<canvas>").attr("width", canvasWidth).attr("height", canvasHeight);
				var		ctx = canvas[0].getContext("2d");

				ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

				// --- important !!!
				// --- image quality change supported for image/jpeg only
				var		fType = "image/jpeg";
				var		imgDataURL = canvas[0].toDataURL(fType, 0.92);

				if(imgDataURL.length < CHAT_MAX_IMAGE_SIZE)
				{
					MessageSendLoadingLayout();
					ws.send("{ \"RequestType\":\"SendMessage\", \"RequestID\":\"" + Math.floor(Math.random() * 1000000000) + "\", \"toType\":\"toUser\", \"toID\":\"" + messageRecipient + "\", \"fileType\":\"" + fType + "\", \"messageType\":\"image\", \"message\":\"" + imgDataURL + "\"}" );
				}
				else
				{
					$("#ControlButtonPhoto").popover({"content": "картинка слишком большая", "placement":"top", "container":"body", "html":"true"})
											.popover("show");
					setTimeout(function () 
						{
							$("#ControlButtonPhoto").popover("destroy");
						}, 3000);
				}

				URL.revokeObjectURL(url);
				img = null;
			}

			img.src = url;

		});

/*		{
				var	fName = file.name;
				var	fSize = file.size;
				var	fType = file.type;
				var fReader = new FileReader();

				fReader.addEventListener("load", function(e){
					console.debug(fType + ": " + fName + " (" + fSize + " bytes) ");
					console.debug(e.target.result);

					if(fType.match("image.*"))
					{
						ws.send("{ \"RequestType\":\"SendImage\", \"RequestID\":\"" + Math.floor(Math.random() * 1000000000) + "\", \"toType\":\"toUser\", \"toID\":\"" + messageRecipient + "\", \"fileType\":\"" + fType + "\", \"fileName\":\"" + fName + "\", \"fileSize\":\"" + fSize + "\",  \"blob\":\"" + e.target.result + "\" }");
					}
				});

				fReader.readAsDataURL(input.target.files[i]);
		});
*/
	}

	return {
		Init: Init,
	};
}
)();



$(document).ready(function() 
{
	chat.Init();

	$("#ContactAdministrationButton").on("click", function() {
		window.open('mailto:ivan.kuchin@gmail.com?subject=Issue with chat&body=Chat error [' + $("#ContactAdministrationButton").attr("data-error", 'Error') + "]");
		$("#ContactAdministrationDialog").modal("hide");
	});

});