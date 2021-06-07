/*jslint devel: true, indent: 4, maxerr: 50*/ 
/*global module, define*/
/*global DrawUserAvatar:off*/
/*global DrawCompanyAvatar:off*/
/*global userCache:off*/

// --- change it in (chat.js, common.js, localy.h)
var FREQUENCY_ECHO_REQUEST = 60;
var FREQUENCY_USERNOTIFICATION_REQUEST = 60 * 5;
var FREQUENCY_RANDOM_FACTOR = 10;

// -- global var used because of setTimeout don't support parameters in IE9
var	navMenu_search = navMenu_search || {};
var	navMenu_chat = navMenu_chat || {};
var navMenu_userNotification = navMenu_userNotification || {};
var userRequestList; 

system_calls = (function()
{
	"use strict";
	var	userSignedIn = false;
	var	firstRun = true; // --- used to fire one time running func depends on userSignedIn
	var	companyTypes = ["___","ООО","ОАО","ПАО","ЗАО","Группа","ИП","ЧОП","Концерн","Конгломерат","Кооператив","ТСЖ","Холдинг","Корпорация","НИИ"].sort();

	var	current_script_global = "index.cgi";
	var	globalScrollPrevOffset = -1;

	var Init = function() 
	{
		// --- Turn of AJAX caching
		$.ajaxSetup({ cache: false });

		// --- Animate shadow on logo
		$("#imageLogo").on("mouseover", function() { $(this).addClass("box-shadow--8dp"); });
		$("#imageLogo").on("mouseout", function() { $(this).removeClass("box-shadow--8dp"); });

		// --- Friendship buttons
		$("#DialogFriendshipRemovalYesNo .__submit").on("click", ButtonFriendshipRemovalYesHandler);
		$("#DialogFriendshipRemovalYesNo").on("shown.bs.modal", 
			function()
			{
				$("#DialogFriendshipRemovalYesNo button.btn.btn-default").focus();
			});


		// --- Friends href
		$("#navbar-my_network").on("click", function() 
			{
				window.location.href = "/my_network?rand=" + Math.random()*98765432123456;
			} );

		// --- Сhat href
		$("#navbar-chat").on("click", function() 
			{
				window.location.href = "/chat?rand=" + Math.random()*98765432123456;
			} );

		// --- Notification href
		$("#navbar-notification").on("click", function() 
			{
				window.location.href = "/user_notifications?rand=" + Math.random()*98765432123456;
			} );

		// --- Menu drop down on mouse over
		jQuery("ul.nav li.dropdown").mouseenter(function() {
			jQuery(this).find(".dropdown-menu").stop(true, true).delay(200).fadeIn();
		});
		jQuery("ul.nav li.dropdown").mouseleave(function() {
			jQuery(this).find(".dropdown-menu").stop(true, true).delay(200).fadeOut();
		});

		// --- Check availability / sign-in
		window.setTimeout(system_calls.SendEchoRequest, 1000);

/*
		// --- Check system notifications
		window.setTimeout(system_calls.GetUserRequestNotifications, 1200);

		// --- Check chat messages
		window.setTimeout(navMenu_chat.GetUserChatMessages, 1100);

		// --- Display Notifications 
		window.setTimeout(system_notifications.Display, 5000);
*/
		// --- Main search
		$("#navMenuSearchText")
								.on("keyup", navMenu_search.OnKeyupHandler)
								.autocomplete({
												source: "/cgi-bin/anyrole_1.cgi?action=AJAX_getUserAutocompleteList",
												select: navMenu_search.AutocompleteSelectHandler,
											});

		$("#navMenuSearchSubmit").on("click", navMenu_search.OnSubmitClickHandler);
	};

	var	GetUUID = function()
	{
		return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {var r = Math.random()*16|0, v = c == "x" ? r : (r&0x3|0x8);return v.toString(16);});
	};

	var	isUserSignedin = function()
	{
		return userSignedIn;
	};

	var	SetUserSignedout = function()
	{
		userSignedIn = false;
	};

	var	SetUserSignedin = function()
	{
		userSignedIn = true;
	};

	var	GetIntoPublicZone = function() 
	{
		window.location.replace("/autologin?rand=" + Math.random()*98765432123456);
	};

	function isTouchBasedUA() {
		try{ document.createEvent("TouchEvent"); return true; }
		catch(e){ return false; }
	}

	function isOrientationPortrait()
	{
		return ($(window).height() > $(window).width() ? true : false);
	}

	function isOrientationLandscape()
	{
		return ($(window).width() > $(window).height() ? true : false);
	}

	var	RemoveSpaces = function(text)
	{
		var result = text;

		result = result.replace(/ /g, "");
		return result;
	};

	var CutLongMessages = function(message)
	{
		if(message.length > 19)
		{
			return message.substr(0, 19) + "...";
		}

		return message;
	};

	var	PopoverError = function(tagID, message, placement)
	{
		var		alarm_tag;
		var		attr_id = "";
		var		error_message = "";
		var		loop_counter = 0;
		var		original_tag = tagID;
		var		display_timeout = Math.min(Math.max(30, message.length) * 100, 10000);

		if(placement) { /* no action needed */ } else { placement = "top"; }

		if(typeof(tagID) == "string") 		{ alarm_tag = $("#" + tagID); attr_id = tagID; }
		else if(typeof(tagID) == "object")	{ alarm_tag = tagID; attr_id = tagID.attr("id"); }
		else console.error("unknown tagID type(" + typeof(tagID) + ")");

		console.error("ERROR: tagID(" + attr_id + ") " + message);

		while(alarm_tag.is(":visible") === false)
		{
			alarm_tag = alarm_tag.parent();

			if(loop_counter++ > 5)
			{
				error_message = "fail to find visible parent to " + original_tag.attr("id");
				break;
			}
		}

		if(error_message.length === 0)
		{
			if(typeof alarm_tag != "undefined")
			{
				alarm_tag
					.attr("disabled", "disabled")
					.popover({"content": message, "placement":placement, "html": true})
					.popover("show");

				if(alarm_tag.parent().hasClass("has-feedback"))
				{
					alarm_tag
						.parent()
						.removeClass("has-success")
						.addClass("has-feedback has-error");
				}

				setTimeout(function ()
					{
						alarm_tag
							.removeAttr("disabled")
							.popover("destroy");
						if(alarm_tag.parent().hasClass("has-feedback"))
						{
							alarm_tag
								.parent()
								.removeClass("has-feedback has-error");
						}
					}, display_timeout);
			}
		}
		else
		{
			console.error(error_message);
		}
	};

	var	PopoverInfo = function(tagID, message, html)
	{
		var		alarm_tag;
		var		error_message = "";
		var		loop_counter = 0;
		var		original_tag = tagID;
		var		display_timeout = Math.min(Math.max(30, message.length) * 100, 10000);

		if(html) { /* no action needed */ } else { html = false; }

		if(typeof(tagID) == "string") 		{ alarm_tag = $("#" + tagID); }
		else if(typeof(tagID) == "object")	{ alarm_tag = tagID; }
		else console.error("unknown tagID type(" + typeof(tagID) + ")");

		while(alarm_tag.is(":visible") === false)
		{
			alarm_tag = alarm_tag.parent();

			if(loop_counter++ > 5)
			{
				error_message = "fail to find visible parent to " + original_tag;
				break;
			}
		}

		if(error_message.length === 0)
		{
			if(typeof alarm_tag != "undefined")
			{
				$(alarm_tag)
					.attr("disabled", "disabled")
					.popover({"content": message, "placement":"top", html: html})
					.popover("show");
				setTimeout(function ()
				{
					$(alarm_tag)
						.removeAttr("disabled")
						.popover("destroy");
				}, display_timeout);
			}
		}
		else
		{
			console.error(error_message);
		}
	};

	var	AlertError = function(tagID, message)
	{
		$("#" + tagID).addClass("animateClass");
		$("#" + tagID).addClass("form-group alert alert-danger");
		$("#" + tagID).append(message);

		setTimeout(function () 
			{
				$("#" + tagID).empty().removeClass("form-group alert alert-danger");
			}, 3000);
	};


	// --- https://stackoverflow.com/questions/400212/how-do-i-copy-to-the-clipboard-in-javascript
	var copyToClipboard = function(text) 
	{
		if (window.clipboardData && window.clipboardData.setData) 
		{
			// Internet Explorer-specific code path to prevent textarea being shown while dialog is visible.
			return window.clipboardData.setData("Text", text);

		}
		else if (document.queryCommandSupported && document.queryCommandSupported("copy")) 
		{
			var textarea = document.createElement("textarea");
			textarea.textContent = text;
			textarea.style.position = "fixed";  // Prevent scrolling to bottom of page in Microsoft Edge.
			document.body.appendChild(textarea);
			textarea.select();
			try {
				return document.execCommand("copy");  // Security exception may be thrown by some browsers.
			}
			catch (ex) {
				console.warn("Copy to clipboard failed.", ex);
				return false;
			}
			finally {
				document.body.removeChild(textarea);
			}
		}
	};

	var FilterUnsupportedUTF8Symbols = function(plainText)
	{
		var	result = plainText;

		result = result.replace(/–/img, "-");
		result = result.replace(/•/img, "*");
		result = result.replace(/"/img, "&quot;");
		result = result.replace(/\\/img, "&#92;");
		result = result.replace(/^\s+/, "");
		result = result.replace(/\s+$/, "");

		return result;
	};

	var	PrebuiltInitValue = function(htmlText)
	{
		var	result = htmlText;
		
		result = result.replace(/&amp;/img, "&");

		return result;
	};

	var ConvertHTMLToText = function(htmlText)
	{
		var	result = htmlText;

		result = result.replace(/<br>/img, "\n");
		result = result.replace(/&amp;/img, "&");
		result = result.replace(/&lt;/img, "<");
		result = result.replace(/&gt;/img, ">");
		result = result.replace(/•/img, "*");
		result = result.replace(/&quot;/img, "\"");
		result = result.replace(/&#92;/img, "\\");
		result = result.replace(/&#39;/img, "'");
		result = result.replace(/^\s+/, "");
		result = result.replace(/\s+$/, "");

		return result;
	};

	var ConvertTextToHTML = function(plainText)
	{
		var	result = plainText;

		result = FilterUnsupportedUTF8Symbols(result);
		result = result.replace(/</img, "&lt;");
		result = result.replace(/>/img, "&gt;");
		result = result.replace(/\n/img, "<br>");
		result = result.replace(/•/img, "*");
		result = result.replace(/^\s+/, "");
		result = result.replace(/\s+$/, "");

		return result;
	};

	var	ConvertMonthNameToNumber = function(srcStr)
	{
		var		dstStr = srcStr;

		dstStr = dstStr.replace(/Январь/i, "01");
		dstStr = dstStr.replace(/Янв/i, "01");
		dstStr = dstStr.replace(/Февраль/i, "02");
		dstStr = dstStr.replace(/Фев/i, "02");
		dstStr = dstStr.replace(/Март/i, "03");
		dstStr = dstStr.replace(/Мар/i, "03");
		dstStr = dstStr.replace(/Апрель/i, "04");
		dstStr = dstStr.replace(/Апр/i, "04");
		dstStr = dstStr.replace(/Май/i, "05");
		dstStr = dstStr.replace(/Июнь/i, "06");
		dstStr = dstStr.replace(/Июн/i, "06");
		dstStr = dstStr.replace(/Июль/i, "07");
		dstStr = dstStr.replace(/Июл/i, "07");
		dstStr = dstStr.replace(/Август/i, "08");
		dstStr = dstStr.replace(/Авг/i, "08");
		dstStr = dstStr.replace(/Сентябрь/i, "09");
		dstStr = dstStr.replace(/Сент/i, "09");
		dstStr = dstStr.replace(/Сен/i, "09");
		dstStr = dstStr.replace(/Октябрь/i, "10");
		dstStr = dstStr.replace(/Окт/i, "10");
		dstStr = dstStr.replace(/Ноябрь/i, "11");
		dstStr = dstStr.replace(/Ноя/i, "11");
		dstStr = dstStr.replace(/Декабрь/i, "12");
		dstStr = dstStr.replace(/Дек/i, "12");

		return dstStr;
	};

	var	ConvertMonthNumberToAbbrName = function(srcStr)
	{
		var		dstStr = String(srcStr);

		dstStr = dstStr.replace(/^0?1$/i, "Янв");
		dstStr = dstStr.replace(/^0?2$/i, "Фев");
		dstStr = dstStr.replace(/^0?3$/i, "Мар");
		dstStr = dstStr.replace(/^0?4$/i, "Апр");
		dstStr = dstStr.replace(/^0?5$/i, "Май");
		dstStr = dstStr.replace(/^0?6$/i, "Июн");
		dstStr = dstStr.replace(/^0?7$/i, "Июл");
		dstStr = dstStr.replace(/^0?8$/i, "Авг");
		dstStr = dstStr.replace(/^0?9$/i, "Сен");
		dstStr = dstStr.replace(/^10$/i, "Окт");
		dstStr = dstStr.replace(/^11$/i, "Ноя");
		dstStr = dstStr.replace(/^12$/i, "Дек");

		return dstStr;
	};

	var	ConvertMonthNumberToFullName = function(srcStr)
	{
		var		dstStr = String(srcStr);

		dstStr = dstStr.replace(/^0?1$/i, "Января");
		dstStr = dstStr.replace(/^0?2$/i, "Февраля");
		dstStr = dstStr.replace(/^0?3$/i, "Марта");
		dstStr = dstStr.replace(/^0?4$/i, "Апреля");
		dstStr = dstStr.replace(/^0?5$/i, "Мая");
		dstStr = dstStr.replace(/^0?6$/i, "Июня");
		dstStr = dstStr.replace(/^0?7$/i, "Июля");
		dstStr = dstStr.replace(/^0?8$/i, "Августа");
		dstStr = dstStr.replace(/^0?9$/i, "Сентября");
		dstStr = dstStr.replace(/^10$/i, "Октября");
		dstStr = dstStr.replace(/^11$/i, "Ноября");
		dstStr = dstStr.replace(/^12$/i, "Декабря");

		return dstStr;
	};

	// Convert from SQL format to HumaReadable
	// SQL: yyyy-mm-dd (for ex: 1980-08-15)
	// Human readable: dd MM yyyy (for ex: 15 Aug 1980)
	var	ConvertDateSQLToHuman = function(sqlDate)
	{
		var		dateArr = sqlDate.split(/-/);

		return (((parseInt(dateArr[2])  < 10) && (dateArr[2].length == 1)) ? "0" + dateArr[2] : dateArr[2]) + " " + ConvertMonthNumberToAbbrName(dateArr[1]) + " " + dateArr[0];
	};

	// Convert from SQL format to HumaReadable
	// SQL: dd/mm/yyyy (for ex: 15/08/1980)
	// Human readable: dd MM yyyy (for ex: 15 Aug 1980)
	var	ConvertDateRussiaToHuman = function(sqlDate)
	{
		var		dateArr = sqlDate.split(/\//);

		return dateArr[0] + " " + ConvertMonthNumberToAbbrName(dateArr[1]) + " " + (((parseInt(dateArr[2])  < 10) && (dateArr[2].length == 1)) ? "0" + dateArr[2] : dateArr[2]);
	};

	// Convert from SQL format to HumaReadable
	// SQL: dd/mm/yyyy (for ex: 15/08/1980)
	// Human readable: dd MM (for ex: 15 Августа)
	var	ConvertDateRussiaToHumanWithoutYear = function(sqlDate)
	{
		var		dateArr = sqlDate.split(/\//);

		return dateArr[0] + " " + ConvertMonthNumberToFullName(dateArr[1]);
	};

	// Convert from SQL format to HumaReadable
	// SQL: dd/mm/yyyy (for ex: 15/08/1980)
	// Human readable: dd MM (for ex: 15 Августа 1980)
	var	ConvertDateRussiaToHumanFullMonth = function(sqlDate)
	{
		var		dateArr = sqlDate.split(/\//);

		return dateArr[0] + " " + ConvertMonthNumberToFullName(dateArr[1]) + " " + (((parseInt(dateArr[2])  < 10) && (dateArr[2].length == 1)) ? "0" + dateArr[2] : dateArr[2]);
	};

	var	GetLocalizedDateNoTimeFromTimestamp = function(timestampEvent)
	{
		var		result;

		result = timestampEvent.getDate() + " " + system_calls.ConvertMonthNumberToAbbrName( (timestampEvent.getMonth() + 1) ) + " " + timestampEvent.getFullYear();

		return result;
	};

	var	GetLocalizedDateFromTimestamp = function(timestampEvent)
	{
		var		result;

		result = (timestampEvent.getHours() < 10 ? "0" : "") + timestampEvent.getHours() + ":" + (timestampEvent.getMinutes() < 10 ? "0" : "") + timestampEvent.getMinutes() + ":" + (timestampEvent.getSeconds() < 10 ? "0" : "") + timestampEvent.getSeconds() + " " + timestampEvent.getDate() + " " + system_calls.ConvertMonthNumberToAbbrName( (timestampEvent.getMonth() + 1) ) + " " + timestampEvent.getFullYear();

		return result;
	};

	// --- input seconds since 1970 to event
	// --- output example: 2017-5-2
	var	GetSQLFormatedDateNoTimeFromTimestamp = function(timestampEvent)
	{
		var		result;

		result = timestampEvent.getFullYear() + "-" + String(timestampEvent.getMonth() + 1) + "-" + timestampEvent.getDate();

		return result;
	};


	// --- input: seconds since 1970 GMT
	// --- output: example: 2 Май 2017
	var	GetLocalizedDateNoTimeFromSeconds = function(seconds)
	{
		var		timestampEvent = new Date(GetMsecSinceEpoch(seconds));
		return GetLocalizedDateNoTimeFromTimestamp(timestampEvent);
	};

	// --- input: seconds since 1970 GMT
	// --- output: example: 13:34:01 2 Май 2017
	var	GetLocalizedDateFromSeconds = function(seconds)
	{
		var		timestampEvent = new Date(GetMsecSinceEpoch(seconds));

		return GetLocalizedDateFromTimestamp(timestampEvent);
	};

	var	GetLocalizedDateFromDelta = function(seconds)
	{
		var		timestampNow = new Date();
		var		timestampEvent = new Date(timestampNow.getTime() - ((typeof(seconds) == "string") ? parseInt(seconds) : seconds) * 1000);

		return GetLocalizedDateFromTimestamp(timestampEvent);
	};


	// --- input: format
	// ---		YYYY - year (2012)
	// ---		YYY - year, don't show if same as now
	// ---		YY - year (12)
	// ---		MM - month (08)
	// ---		MMM - short month (Авг)
	// ---		MMMM - spelled month (Августа)
	// ---		DD - day
	// ---		HH - hour
	// ---		hh - hour
	// ---		mm - mins
	// ---		ss - seconds
	var	GetFormattedDateFromSeconds = function(seconds, format)
	{
		var		result = "";

		if(typeof(format) == "undefined")
		{
			console.error("format parameter mandatory");
		}
		else
		{
			var		timestamp = new Date(GetMsecSinceEpoch(seconds));
			var		timestampNow = new Date();

			result = format;

			if(format.match(/\bYYYY\b/)) result = result.replace(/\bYYYY\b/g, timestamp.getFullYear());
			if(format.match(/\bYYY\b/)) result = result.replace(/\bYYY\b/g, timestamp.getYear() == timestampNow.getYear() ? "" : timestamp.getFullYear());
			if(format.match(/\bYY\b/)) result = result.replace(/\bYY\b/g, "'" + String(timestamp.getYear() - 100) );
			if(format.match(/\bMM\b/)) result = result.replace(/\bMM\b/g, timestamp.getMonth() + 1);
			if(format.match(/\bMMM\b/)) result = result.replace(/\bMMM\b/g, ConvertMonthNumberToAbbrName(timestamp.getMonth() + 1));
			if(format.match(/\bMMMM\b/)) result = result.replace(/\bMMMM\b/g, ConvertMonthNumberToFullName(timestamp.getMonth() + 1));
			if(format.match(/\bDD\b/)) result = result.replace(/\bDD\b/g, timestamp.getDate());
			if(format.match(/\bHH\b/)) result = result.replace(/\bHH\b/g, timestamp.getHours());
			if(format.match(/\bhh\b/)) result = result.replace(/\bhh\b/g, timestamp.getHours());
			if(format.match(/\bmm\b/)) result = result.replace(/\bmm\b/g, (timestamp.getMinutes() < 10 ? "0" : "") + timestamp.getMinutes());
			if(format.match(/\bss\b/)) result = result.replace(/\bss\b/g, (timestamp.getSeconds() < 10 ? "0" : "") + timestamp.getSeconds());
		}

		return result;
	};


	var	GetSQLFormatedDateNoTimeFromSeconds = function(seconds)
	{
		var		timestampEvent = new Date(GetMsecSinceEpoch(seconds));

		return GetSQLFormatedDateNoTimeFromTimestamp(timestampEvent);
	};

	var	GetMinutesSpelling = function(units)
	{
		var		result = "";

		if((units >= 5) && (units <= 20)) { result = "минут"; }
		else if(units % 10 == 1) { result = "минута"; }
		else if((units % 10 >= 2) && (units % 10 <= 4)) { result = "минуты"; }
		else { result = "минут"; }

		return result;
	};

	var	GetHoursSpelling = function(units)
	{
		var		result = "";

		if((units >= 5) && (units <= 20)) { result = "часов"; }
		else if(units % 10 == 1) { result = "час"; }
		else if((units % 10 >= 2) && (units % 10 <= 4)) { result = "часа"; }
		else { result = "часов"; }

		return result;
	};

	var	GetDaysSpelling = function(units)
	{
		var		result = "";

		if((units >= 5) && (units <= 20)) { result = "дней"; }
		else if(units % 10 == 1) { result = "день"; }
		else if((units % 10 >= 2) && (units % 10 <= 4)) { result = "дня"; }
		else { result = "дней"; }

		return result;
	};

	var	GetMonthsSpelling = function(units)
	{
		var		result = "";

		if((units >= 5) && (units <= 20)) { result = "месяцев"; }
		else if(units % 10 == 1) { result = "месяц"; }
		else if((units % 10 >= 2) && (units % 10 <= 4)) { result = "месяца"; }
		else { result = "месяцев"; }

		return result;
	};

	var	GetYearsSpelling = function(units)
	{
		var		result = "";

		if((units >= 5) && (units <= 20)) { result = "лет"; }
		else if(units % 10 == 1) { result = "год"; }
		else if((units % 10 >= 2) && (units % 10 <= 4)) { result = "года"; }
		else { result = "лет"; }

		return result;
	};

	var	GetSpellingMonthName = function(id)
	{
		var		result;

		if(id == 1) result = "января";
		if(id == 2) result = "февраля";
		if(id == 3) result = "марта";
		if(id == 4) result = "апреля";
		if(id == 5) result = "мая";
		if(id == 6) result = "июня";
		if(id == 7) result = "июля";
		if(id == 8) result = "августа";
		if(id == 9) result = "сентября";
		if(id == 10) result = "октября";
		if(id == 11) result = "ноября";
		if(id == 12) result = "декабря";

		return	result;
	};

	var	GetTodaysYear = function()
	{
		return new Date().getFullYear();
	};

	// --- private !!! don't use it from outside classes
	var	GetMsecSinceEpoch = function(seconds)
	{
		var		result = ((typeof(seconds) == "string") ? parseInt(seconds) : seconds) * 1000;

		return 	result;
	};

	// --- input: second since 1970
	// --- output: DD/mm/YYYY (for ex: 02/05/2017)
	var	GetLocalizedRUFormatDateNoTimeFromSeconds = function(seconds)
	{
		var msecSince1970 = GetMsecSinceEpoch(seconds);
		var	d1 = new Date(msecSince1970);
		var	day =  d1.getDay();
		var	mon = d1.getMonth() + 1;
		var	year = d1.getYear() + 1900;

		if(day < 10) day = "0" + day;
		if(mon < 10) mon = "0" + mon;

		return (day + "/" + mon + "/" + year);
	};

	// --- input: 0
	// --- output: 31 декабря 1969
	var	GetLocalizedDateInHumanFormatSecSince1970 = function(seconds)
	{
		var msecSince1970 = GetMsecSinceEpoch(seconds);

		return(GetLocalizedDateInHumanFormatMsecSince1970(msecSince1970));
	};

	// --- input: 3600 000 
	// --- output: 1 час назад
	var	GetLocalizedDateInHumanFormatMsecSinceEvent = function(secSinceEvent)
	{
		var		timestampNow = new Date();
		// var		timestamp1970 = new Date(1970, 0, 1);

		return(GetLocalizedDateInHumanFormatMsecSince1970(timestampNow.getTime() - secSinceEvent));
	};

	// --- private !!! don't use it from outside classes
	var	GetLocalizedDateInHumanFormatMsecSince1970 = function(msecEventSince1970)
	{
		var		timestampNow = new Date();
		var		timestampEvent = new Date(msecEventSince1970);
		
		var		differenceFromNow = (timestampNow.getTime() - msecEventSince1970) / 1000;
		var		minutes;
		var 	hours;
		var		months;
		var		days;

		var		result = "";

		if(differenceFromNow < 60 * 60)
		{
			minutes = Math.floor(differenceFromNow / 60);

			result  =  minutes + " " + GetMinutesSpelling(minutes) + " назад";
		}
		else if(differenceFromNow < 24 * 60 * 60)
		{
			hours = Math.floor(differenceFromNow / (60 * 60));

			result  = hours + " " + GetHoursSpelling(hours) + " назад";
		}
		else if(differenceFromNow < 30 * 24 * 60 * 60)
		{
			days = Math.floor(differenceFromNow / (24 * 60 * 60)); 


			result  = days + " " + GetDaysSpelling(days) + " назад";
		}
		else if(differenceFromNow < 12 * 30 * 24 * 60 * 60)
		{
			months = Math.floor(differenceFromNow / (30 * 24 * 60 * 60));
			days = Math.floor((differenceFromNow - months * 30 * 24 * 60 * 60) / (24 * 60 * 60));

			result  = months + " " + GetMonthsSpelling(months) + " " + days + " " + GetDaysSpelling(days) + " назад";
		}
		else 
		{
			result = timestampEvent.getDate() + " " + GetSpellingMonthName(timestampEvent.getMonth() + 1) + " " + timestampEvent.getFullYear();
		}

		return result;
	};


	// --- input: duration in seconds
	// --- output:	5 дней
	// --- 			2 месяца 
	// --- 			1 год 2 месяца 
	// --- 			3 года 11 месяцев 
	// ---							 ^^^^^^ (no days, no hours, no minutes)	
	var	GetLocalizedWorkDurationFromDelta = function(seconds)
	{
		var		result = "";
		var		minutes;
		var 	hours;
		var		days;
		var		months;
		var		years;

		if(seconds < 60 * 60)
		{
			minutes = Math.floor(seconds / 60);

			result  =  minutes + " " + GetMinutesSpelling(minutes);
		}
		else if(seconds < 24 * 60 * 60)
		{
			hours = Math.floor(seconds / (60 * 60));

			result  = hours + " " + GetHoursSpelling(hours);
		}
		else if(seconds < 30 * 24 * 60 * 60)
		{
			days = Math.floor(seconds / (24 * 60 * 60)); 


			result  = days + " " + GetDaysSpelling(days);
		}
		else if(seconds < 365 * 24 * 60 * 60)
		{
			months = Math.floor(seconds / (30 * 24 * 60 * 60));

			result  = months + " " + GetMonthsSpelling(months);
		}
		else 
		{
			years = Math.floor(seconds / (365 * 24 * 60 * 60));
			months = Math.floor((seconds - years * 365 * 24 * 60 * 60) / (30 * 24 * 60 * 60));

			result  = years + " " + GetYearsSpelling(years) + (parseInt(months) ? " " + months + " " + GetMonthsSpelling(months) : "");
		}

		return result;
	};

	var	GetGenderedPhrase = function(object, commonPhrase, malePhrase, femalePhrase)
	{
		var		result = commonPhrase;
		var		temp;

		if((typeof(object.srcObj) != "undefined") && (typeof(object.srcObj.sex) != "undefined")) 
			temp = object.srcObj.sex;
		else if(typeof(object.userSex) != "undefined")
			temp = object.userSex;
		else if(typeof(object.notificationFriendUserSex) != "undefined")
			temp = object.notificationFriendUserSex;

		if(temp == "male") result = malePhrase;
		else if(temp == "female") result = femalePhrase;

		return	result;
	};

	var GetGenderedActionCategoryTitle = function(feedItem)
	{
		return GetGenderedPhrase(feedItem, feedItem.actionCategoryTitle, feedItem.actionCategoryTitleMale, feedItem.actionCategoryTitleFemale);
	};

	var GetGenderedActionTypeTitle = function(feedItem)
	{
		return GetGenderedPhrase(feedItem, feedItem.actionTypesTitle, feedItem.actionTypesTitleMale, feedItem.actionTypesTitleFemale);
	};

	var SendEchoRequest = function()
	{
		// console.debug('system_calls.SendEchoRequest: start');
		$.getJSON(
			"/cgi-bin/system.cgi",
			{action:"EchoRequest"})
			.done(function(data) 
				{
					// console.debug("system_calls.SendEchoRequest: DoneHandler: start");
					if(data.type == "EchoResponse")
					{
						if(data.session == "true")
						{
							// console.debug("system_calls.SendEchoRequest: DoneHandler: session exists and consistent");
							if(data.user == "true")
							{
								// console.debug("system_calls.SendEchoRequest: DoneHandler: user is logged in");
								SetUserSignedin();

								if(firstRun)
								{
									// --- Check system notifications
									window.setTimeout(system_calls.GetUserRequestNotifications, 1200);

									// --- Check chat messages
									window.setTimeout(navMenu_chat.GetUserChatMessages, 1100);

									// --- Display Notifications 
									// window.setTimeout(system_notifications.Display, 5000);

									firstRun = false;
								}
							}
							else
							{
								// --- no need to redirect to public zone 
								// --- this will brake Guest view of news_feed

								// console.debug("system_calls.SendEchoRequest: DoneHandler: guest user");
								SetUserSignedout();
							}
						}
						else
						{
							// console.debug("system_calls.SendEchoRequest: DoneHandler: session doesn't exists on server, session must be deleted, parent window must be redirected");

							SetUserSignedout();

							// --- Clear session must be here
							// --- Explanation:
							// ---		Once sessison timed out, EchoRequest will return "session" == false
							// ---		This mean that cookie and persistence must be cleared.
							// ---		Otherwise: double redirect to autologin
							// ---			Redirect to index.cgi/action=autologin will define that cookies are incorrect, expire cookie and redirect to autologin again
							ClearSession();
							GetIntoPublicZone();
						}
					}
				}
			);

		// --- check session expiration once per minute
		window.setTimeout(SendEchoRequest, (FREQUENCY_ECHO_REQUEST + (Math.random() * FREQUENCY_RANDOM_FACTOR - FREQUENCY_RANDOM_FACTOR / 2)) * 1000);

		// console.debug('system_calls.SendEchoRequest: end');
	};


	var GetUserRequestNotifications = function()
	{
		if(isUserSignedin())
		{
			$.getJSON(
				"/cgi-bin/system.cgi",
				{action:"GetUserRequestNotifications"})
				.done(function(data) 
					{
						if(data.type == "UnreadUserNotifications")
						{
							if(data.session == "true")
							{
								if(data.user == "true")
								{
									{
										var	badgeSpan = $("<span/>").addClass("badge")
																	.addClass("badge-danger");

										if(data.friendshipNotificationsArray.length > 0)
										{
											badgeSpan.append(data.friendshipNotificationsArray.length);
										}

										$("#user-requests-ahref .badge").remove();
										$("#user-requests-ahref").append(badgeSpan);
									}

									navMenu_userNotification.InitializeData(data.userNotificationsArray);
									navMenu_userNotification.BuildUserNotificationList();

									if(data.userNotificationsArray.length > 0)
									{
										// --- no update required
									}
									else
										navMenu_userNotification.BadgeUpdate();


									userRequestList = data;

									window.setTimeout(BuildUserRequestList, 1000);
								}
								else
								{
									// --- workflow can get here just in case 
									// --- 	1) EchoRequest: session-ok, user-ok
									// ---	AND
									// ---	2) GetNavMenuChatStatus: session-ok, user-NOT_ok
									// --- it means:
									// ---	*) session expired in short period of time 
									// ---  OR
									// ---  *) iOS buggy behavior (assign old cookie in about 3 secs after page reload)
									console.debug("system_calls.GetUserRequestNotifications: DoneHandler: ERROR: guest user");
									GetIntoPublicZone();
								}
							}
							else
							{
								console.debug("system_calls.GetUserRequestNotifications: DoneHandler: ERROR: session does not exists on server, session must be deleted, parent window must be redirected");

								ClearSession();
								GetIntoPublicZone();
							}
						}
					}
				);

		} // --- if(isUserSignedin())
		else
		{
			// --- user not signed in (no need to check notifications)
		}

		// --- check system notifications
		window.setTimeout(system_calls.GetUserRequestNotifications, (FREQUENCY_USERNOTIFICATION_REQUEST + (Math.random() * FREQUENCY_RANDOM_FACTOR - FREQUENCY_RANDOM_FACTOR / 2)) * 1000);

		// console.debug('system_calls.GetUserRequestNotifications: end');
	};

	var	UpdateInputFieldOnServer = function(e)
	{
		var		__Revert_To_Prev_Value = function()
		{
			var	input_tag; 
			
			if(curr_tag.attr("type") == "checkbox")
			{
				curr_tag.prop("checked", curr_tag.attr("data-db_value") == "Y" ? "checked" : "");
			}
			else if(curr_tag[0].tagName == "LABEL")
			{
				input_tag = $("#" + curr_tag.attr("for"));
				input_tag.prop("checked", !input_tag.prop("checked"));

			}
			else
			{
				curr_tag.val(curr_tag.attr("data-db_value"));
			}
		};

		var		__GetTagValue = function(__tag)
		{
			var	curr_value = "";

			if(__tag[0].tagName == "LABEL") 
			{
				__tag = $("#" + __tag.attr("for"));
				curr_value = __tag.prop("checked") ? "N" : "Y"; // --- avoid using click_handler on LABEL, replace it to change_handler of input
																// --- label doesn't immediately update related input value,
																// --- therefore click on a label with associated checkbox in OFF state
																// --- should trigger update on server to a new (ON) state
			}
			else if(__tag.attr("type") == "checkbox")
			{
				curr_value = __tag.prop("checked") ? "Y" : "N";
			}
			else
			{
				curr_value = __tag.val();
			}

			return curr_value;
		};

		var		curr_tag;
		var		curr_value;

		if(typeof(e) != "undefined")
		{
			curr_tag = $(e.currentTarget);

			if("" + curr_tag.data("id") == "0")
			{
				// --- nothing to do
				console.error("data-id not defined");
			}
			else
			{
				var		current_script = curr_tag.attr("data-script") || current_script_global;

				if(current_script.length)
				{
					curr_tag.attr("disabled", "");

					curr_value = __GetTagValue(curr_tag);
					
					$.getJSON(
						"/cgi-bin/" + current_script,
						{
							action: curr_tag.data("action"),
							id: curr_tag.attr("data-id") || curr_tag.data("id"), // --- prefer attr(data_id) over jQuery.data(id), because jQuery.data doesn't updates properly
							value: curr_value,
							sow_id: curr_tag.attr("data-sow_id"),
							company_id: curr_tag.attr("data-company_id"),
						})
						.done(function(data)
						{
							if(data.result == "success")
							{
								// don't change it to .click(), otherwise it may be infinite loop if error
								curr_tag.attr("data-db_value", curr_tag.val());
							}
							else
							{
								__Revert_To_Prev_Value();

								console.error(curr_tag.data("action") + ".done(): ERROR: " + data.description);
								system_calls.PopoverError(curr_tag, "Ошибка: " + data.description);
							}
						})
						.fail(function()
						{
							__Revert_To_Prev_Value();
							system_calls.PopoverError(curr_tag, "Ошибка ответа сервера");
						})
						.always(function()
						{
							curr_tag.removeAttr("disabled");
						});
					
				}
				else
				{
					console.error("unknown script to call. Set the script with attr(\"data-script\") or call system_calls.SetCurrentScript(\"XXXXX.cgi\");");
				}
			}
		}
		else
		{
			console.error("undefined parameter type");
		}
	};

	var	ScrollWindowToElementID = function(elementID)
	{
		if($(elementID).length)
		{
			var	elementOffset 			= $(elementID).offset().top;
			// var	elementClientHeight 	= $(elementID)[0].clientHeight;
			var	windowScrollTop			= $(window).scrollTop();
			// var	windowHeight			= $(window).height();

			console.debug("ScrollWindowToElementID: prevOffset[" + globalScrollPrevOffset + "] == scroll len to elem = " + (elementOffset - windowScrollTop));

			// --- scroll only if 
			// --- 1) scroll length to element > 10
			// --- 2) scroll from previous to current cycles is successful (page was scrolled)
			// if((Math.abs(elementOffset - windowScrollTop) > 10) && (!globalScrollPrevOffset || (globalScrollPrevOffset > Math.abs(elementOffset - windowScrollTop))))
			if((Math.abs(elementOffset - windowScrollTop) > 10) && (globalScrollPrevOffset != (elementOffset - windowScrollTop)))
			{
				globalScrollPrevOffset = elementOffset - windowScrollTop;

				$("body").animate({scrollTop: elementOffset }, 400);
				$("html").animate({scrollTop: elementOffset }, 400);

				setTimeout(function() { ScrollWindowToElementID(elementID); }, 600);
			}
			else
			{
				globalScrollPrevOffset = 0;
			}
		}
	};

	var	GetParamFromURL = function(paramName)
	{
		var result = ""; 
		var	tmp = new RegExp("[?&]" + paramName + "=([^&#]*)").exec(window.location.href);

		if(tmp && tmp.length) result = tmp[1];

		return result;
	};

	var GlobalBuildFoundFriendSingleBlock = function(item)
	{
		var 	tagDiv1, tagDiv2, tagDiv3, tagA3, tagImg3, tagDiv4, tagA5, tag_lg_layout, tagCanvas3, tagUl5;
		var		tag_xs_layout;

		tagDiv1 		= $("<div/>")	.addClass("container");
		tagDiv2 		= $("<div/>")	.addClass("row container");
		tagDiv3 		= $("<div/>")	.addClass("col-lg-1 col-md-1 col-sm-2 col-xs-3 margin_top_bottom_15_0");
		tagA3   		= $("<a>")		.attr("href", "/userprofile/" + item.id);

		tagCanvas3		= $("<canvas>")	.attr("width", "80")
										.attr("height", "80")
										.addClass("canvas-big-avatar");
		tagDiv4 		= $("<div/>")	.addClass("col-md-10 col-xs-12  single_block box-shadow--6dp padding_top_bottom_5px");
		tagA5   		= $("<a>")		.attr("href", "/userprofile/" + item.id);
		tagUl5			= $("<dl/>")	.addClass("margin_bottom_0"); //.addClass("dl-horizontal");
		tag_lg_layout	= $("<span>")	.addClass("hidden-xs float_right");
		tag_xs_layout	= $("<div>")	.addClass("col-xs-9 visible-xs-inline margin_top_bottom_15_0");

		RenderFriendshipButtons(item, tag_lg_layout, false);
		RenderFriendshipButtons(item, tag_xs_layout, false);
		RenderChatButton(item, tag_lg_layout);
		RenderChatButton(item, tag_xs_layout);

		tagDiv1.append(tagDiv2);
		tagDiv2 .append(tagDiv3)
				.append(tag_xs_layout)
				.append(tagDiv4);
		tagDiv3.append(tagA3);
		tagA3.append(tagImg3);
		tagA3.append(tagCanvas3);
		tagDiv4.append(tag_lg_layout);
		tagDiv4.append(tagA5);
		tagA5.append("<span><h4>" + item.name + " " + item.nameLast + "</h4></span>");

		tagDiv4.append(tagUl5);
		item.currentEmployment.forEach(function(item) 
			{
				tagUl5.append("<dt>" + item.company + "</dt>");
				tagUl5.append("<dd>" + item.title + "</dd>");
			});

		DrawUserAvatar(tagCanvas3[0].getContext("2d"), item.avatar, item.name, item.nameLast);

		return tagDiv1;
	};

	// --- build "management" buttons and put it into DOM-model
	// --- input
	// ---		companyInfo - info from GetUserListInJSONFormat
	// ---		housingTag - tag where buttons have to be placed to
	var RenderCompanyManagementButton = function(companyInfo, housingTag, callbackFunc)
	{
		var		buttonCompany1;

		buttonCompany1 = $("<button/>").data("action", "");
		Object.keys(companyInfo).forEach(function(itemChild) {
			buttonCompany1.data(itemChild, companyInfo[itemChild]);
		});

		if(companyInfo.isMine == "1") 
		{ 
			buttonCompany1.append($("<span>").addClass("glyphicon glyphicon-pencil")) 
							.removeClass()
							.addClass("btn btn-primary form-control")
							.data("action", "companyProfileEdit")
							.attr("title", "Редактировать")
							.tooltip({ animation: "animated bounceIn", placement: "top" });
		}
		else if(companyInfo.isFree == "1") 
		{ 
			buttonCompany1.append($("<span>").addClass("glyphicon glyphicon-plus")) 
							.removeClass()
							.addClass("btn btn-success form-control")
							.data("action", "companyProfileTakeOwnership")
							.attr("data-loading-text", "<span class='fa fa-refresh fa-spin fa-fw animateClass'></span>")
							.attr("title", "Моя компания !")
							.attr("data-target", "#PossessionAlertModal")
							.attr("data-toggle", "modal")
							.tooltip({ animation: "animated bounceIn", placement: "top" });
		}
		else
		{ 
			buttonCompany1.append($("<span>").addClass("glyphicon glyphicon-question-sign")) 
							.removeClass()
							.addClass("btn btn-danger form-control")
							.data("action", "companyProfileRequestOwnership")
							.attr("title", "Отправить запрос")
							.attr("data-target", "#PossessionRequestModal")
							.attr("data-toggle", "modal")
							.tooltip({ animation: "animated bounceIn", placement: "top" });
		}

		buttonCompany1.on("click", callbackFunc);

		housingTag.append(buttonCompany1);
	};

	// --- build "management" buttons and put it into DOM-model
	// --- input
	// ---		groupInfo - info from GetUserListInJSONFormat
	// ---		housingTag - tag where buttons have to be placed to
	var RenderGroupManagementButton = function(groupInfo, housingTag, callbackFunc)
	{
		var		buttonGroup1;

		buttonGroup1 = $("<button/>").data("action", "");
		Object.keys(groupInfo).forEach(function(itemChild) {
			buttonGroup1.data(itemChild, groupInfo[itemChild]);
		});

		if(groupInfo.isMine == "1") 
		{ 
			buttonGroup1.append($("<span>").addClass("glyphicon glyphicon-pencil")) 
							.removeClass()
							.addClass("btn btn-primary form-control")
							.data("action", "groupProfileEdit")
							.attr("title", "Редактировать")
							.tooltip({ animation: "animated bounceIn", placement: "top" });

			buttonGroup1.on("click", callbackFunc);

			housingTag.append(buttonGroup1);
		}

	};

	// --- input:
	//			callbackFunc - function called on click event
	var	BuildCompanySingleBlock = function(item, i, arr, callbackFunc)
	{
		var 	divContainer, divRow, divColLogo, tagA3, tagImg3, divInfo, tagA5, spanSMButton, tagCanvas3;
		var		divRowXSButtons, divColXSButtons;

		divContainer= $("<div/>").addClass("container");
		divRow 		= $("<div/>").addClass("row container");
		divColLogo 	= $("<div/>").addClass("col-lg-1 col-md-1 col-sm-2 hidden-xs margin_top_bottom_15_0");
		tagA3   	= $("<a>").attr("href", "/company/" + item.link + "?rand=" + Math.random() * 1234567890);
		// tagImg3 	= $("<img>").attr("src", item["avatar"])
		//						 .attr("height", "80");
		tagCanvas3	= $("<canvas>").attr("width", "80")
									.attr("height", "80")
									.addClass("canvas-big-logo");
		divInfo 		= $("<div/>").addClass("col-sm-10 col-xs-12 single_block box-shadow--6dp");
		tagA5   		= $("<a>").attr("href", "/company/" + item.link + "?rand=" + Math.random() * 1234567890);
		spanSMButton	= $("<span>").addClass("hidden-xs pull-right");
		divRowXSButtons = $("<div>").addClass("row");
		divColXSButtons = $("<div>").addClass("col-xs-12 visible-xs-inline margin_top_bottom_0_15");

		RenderCompanyManagementButton(item, spanSMButton, callbackFunc);
		RenderCompanyManagementButton(item, divColXSButtons, callbackFunc);

		divContainer.append(divRow)
					.append(divRowXSButtons.append(divColXSButtons));
		divRow 		.append(divColLogo)
					.append(divInfo);
		divColLogo	.append(tagA3);
		tagA3		.append(tagImg3);
		tagA3		.append(tagCanvas3);
		divInfo		.append(spanSMButton);
		divInfo		.append(tagA5);
		tagA5		.append("<span><h4>" + item.name + "</h4></span>");
		// --- OOO Cisco Systems vs Cisco Systems
		// tagA5		.append("<span><h4>" + item.type + " " + item.name + "</h4></span>");

		RenderCompanyLogo(tagCanvas3[0].getContext("2d"), (item.logo_filename.length ? "/images/companies/" + item.logo_folder + "/" + item.logo_filename : ""), item.name, "");

		return divContainer;
	};

	// --- input:
	//			callbackFunc - function called on click event
	var	BuildGroupSingleBlock = function(item, i, arr, callbackFunc)
	{
		var 	divContainer, divRow, divColLogo, tagA3, divInfo, tagA5, spanSMButton, tagCanvas3;
		var		divRowXSButtons, divColXSButtons;

		divContainer= $("<div/>").addClass("container");
		divRow 		= $("<div/>").addClass("row container");
		divColLogo 	= $("<div/>").addClass("col-lg-1 col-md-1 col-sm-2 hidden-xs margin_top_bottom_15_0");
		tagA3   	= $("<a>").attr("href", "/group/" + item.link + "?rand=" + GetUUID());
		// tagImg3 	= $("<img>").attr("src", item["avatar"])
		//						 .attr("height", "80");
		tagCanvas3	= $("<canvas>").attr("width", "80")
									.attr("height", "80")
									.addClass("canvas-big-logo");
		divInfo 		= $("<div/>").addClass("col-sm-10 col-xs-12 single_block box-shadow--6dp");
		tagA5   		= $("<a>").attr("href", "/group/" + item.link + "?rand=" + GetUUID());
		spanSMButton	= $("<span>").addClass("hidden-xs pull-right");
		divRowXSButtons = $("<div>").addClass("row");
		divColXSButtons = $("<div>").addClass("col-xs-12 visible-xs-inline margin_top_bottom_0_15");

		RenderGroupManagementButton(item, spanSMButton, callbackFunc);
		RenderGroupManagementButton(item, divColXSButtons, callbackFunc);

		divContainer.append(divRow)
					.append(divRowXSButtons.append(divColXSButtons));
		divRow 		.append(divColLogo)
					.append(divInfo);
		divColLogo	.append(tagA3);

		if(item.isBlocked == "Y")
		{
			var		fa_stack_lock = $("<span>")	.addClass("fa-stack fa-lg")
												.append($("<i>").addClass("fa fa-circle-o fa-stack-2x fa-inverse"))
												.append($("<i>").addClass("fa fa-lock fa-stack-1x fa-inverse"));

			tagA3.append(
				$("<div>")	.addClass("blockedevent") 
							.append(tagCanvas3)
							.append($("<div>").append(fa_stack_lock))
			);
		}
		else
		{
			tagA3.append(tagCanvas3);
		}

		divInfo		.append(spanSMButton)
					.append(tagA5);
		tagA5		.append("<span><h4>" + item.title + "</h4></span>");

		RenderCompanyLogo(tagCanvas3[0].getContext("2d"), (item.logo_filename.length ? "/images/groups/" + item.logo_folder + "/" + item.logo_filename : ""), item.title, "");

		return divContainer;
	};

	var FriendshipButtonClickHandler = function() 
	{
		"use strict";
		var		handlerButton = $(this);

		if(handlerButton.data("action") == "disconnectDialog")
		{
			$("#DialogFriendshipRemovalYesNo").modal("show");
			$("#DialogFriendshipRemovalYesNo .__submit").data("clickedButton", handlerButton);
		}
		else
		{
			handlerButton.addClass("disabled");
			handlerButton.text("Ожидайте ...");

			$.getJSON(
				"/cgi-bin/index.cgi",
				{action:"AJAX_setFindFriend_FriendshipStatus", friendID:handlerButton.data("id"), status:handlerButton.data("action")})
				.done(function(data) {
						console.debug("AJAX_setFindFriend_FriendshipStatus.done(): success");

						if(data.result == "success")
						{
							console.debug("AJAX_setFindFriend_FriendshipStatus.done(): success");

							handlerButton.removeClass("disabled");
							if(handlerButton.data("action") == "requested")
							{
								handlerButton.text("Отменить запрос дружбы");
								handlerButton.removeClass().addClass("btn").addClass("btn-default");
								handlerButton.data("action", "disconnect");
							}
							else if(handlerButton.data("action") == "requesting")
							{
								handlerButton.text("Добавить в друзья");
								handlerButton.removeClass().addClass("btn").addClass("btn-primary");
								handlerButton.data("action", "requested");
							}
							else if(handlerButton.data("action") == "disconnect")
							{
								handlerButton.text("Добавить в друзья");
								handlerButton.removeClass().addClass("btn").addClass("btn-primary");
								handlerButton.data("action", "requested");

								// --- remove "accept" buttonAccept
								handlerButton.siblings().remove();
							}
							else if(handlerButton.data("action") == "confirm")
							{
								handlerButton.text("Убрать из друзей");
								handlerButton.removeClass().addClass("btn").addClass("btn-default");
								handlerButton.data("action", "disconnect");

								// --- remove "reject" buttonAccept
								handlerButton.siblings().remove();
							}
							else
							{
								console.debug("AJAX_setFindFriend_FriendshipStatus.done(): unknown friendship status button");
								handlerButton.text("Добавить в друзья");
								handlerButton.removeClass().addClass("btn").addClass("btn-primary");
								handlerButton.data("action", "requested");
							}
								
							
						}
						else
						{
							console.debug("AJAX_setFindFriend_FriendshipStatus.done(): " + data.result + " [" + data.description + "]");

							handlerButton	.text("Ошибка");
							handlerButton	.removeClass("btn-default")
											.removeClass("btn-primary")
											.addClass("btn-danger", 300);
							
							console.debug("AJAX_setFindFriend_FriendshipStatus.done(): need to notify the Requester");
						}

					}); // --- getJSON.done()
		}
	};

	// --- build "friendship" buttons and put them into DOM-model
	// --- input
	// ---		friendInfo - info from GetUserListInJSONFormat
	// ---		housingTag - tag where buttons have to be placed to
	var RenderFriendshipButtons = function(friendInfo, housingTag, renderBreakupButton)
	{
		var	tagButtonFriend1 = $("<button/>").data("action", "");
		var	tagButtonFriend2 = $("<button/>").data("action", "");

		if($("#myUserID").data("myuserid"))
		{
			Object.keys(friendInfo).forEach(function(itemChild) {
				tagButtonFriend1.data(itemChild, friendInfo[itemChild]);
				tagButtonFriend2.data(itemChild, friendInfo[itemChild]);
			});
			if(friendInfo.userFriendship == "empty") 
			{ 
				tagButtonFriend1.append("<span class=\"fa fa-plus\">") 
								.removeClass()
								.addClass("btn btn-primary float_right")
								.data("action", "requested");
			}
			else if(friendInfo.userFriendship == "confirmed") 
			{ 
				tagButtonFriend1.addClass("btn btn-link color_red")
								.append("Остановить дружбу")
								.data("action", "disconnectDialog");
				if(!renderBreakupButton)
					tagButtonFriend1.addClass("hidden");
			}
			else if(friendInfo.userFriendship == "requested") 
			{ 
				tagButtonFriend1.addClass("btn btn-primary")
								.append("Подтвердить")
								.data("action", "confirm");
				tagButtonFriend2.addClass("btn btn-default")
								.append("Отказаться")
								.data("action", "disconnect");
			}
			else if(friendInfo.userFriendship == "requesting") 
			{ 
				tagButtonFriend1.append("Отменить запрос дружбы")
								.removeClass()
								.addClass("btn btn-default")
								.data("action", "disconnect");
			}
			else if(friendInfo.userFriendship == "blocked") 
			{ 
				tagButtonFriend1.addClass("btn btn-default")
								.append("Снять блокировку")
								.data("action", "disconnect");
			}
			else if(friendInfo.userFriendship == "ignored") 
			{ 
				tagButtonFriend1.addClass("btn btn-default")
								.append("Игнорируется")
								.data("action", "requested");
			}
			else
			{ 
				tagButtonFriend1.addClass("btn btn-primary")
								.append("Добавить в друзья")
								.data("action", "requested");
				console.debug("BuildFoundFriendSingleBlock: ERROR: unknown friendship status [" + friendInfo.userFriendship + "]");
			}

			tagButtonFriend1.on("click", FriendshipButtonClickHandler);
			tagButtonFriend2.on("click", FriendshipButtonClickHandler);

			housingTag.append(tagButtonFriend1);
			if(tagButtonFriend2.data("action").length > 0)
			{
				housingTag.append(" ")
						.append(tagButtonFriend2);
			}
		}

	};


	var DrawCompanyImage = function(context, imageURL, avatarSize)
	{
		var x2 = avatarSize, y2 = avatarSize, radius = avatarSize / 8;
		var		pic = new Image();

		pic.onload = function() { 
			// var		sMaxEdge = Math.max(pic.width, pic.height);
			// var		sX = (pic.width - sMaxEdge) / 2, sY = (pic.height - sMaxEdge) / 2, sWidth = sMaxEdge, sHeight = sMaxEdge;
			// var		dX = 0, dY = 0, dWidth = avatarSize, dHeight = avatarSize;

			var		canvasW = avatarSize, canvasH = avatarSize;
			var		sWidth = pic.width, sHeight = pic.height;
			var		ratioW = canvasW/sWidth, ratioH = canvasH/sHeight;
			var		minRatio = Math.min(ratioW, ratioH);
			var		dWidth = sWidth*minRatio, dHeight = sHeight*minRatio;
			var		dX = (canvasW - dWidth)/2, dY = (canvasH - dHeight)/2;

			context.clearRect(0,0,avatarSize,avatarSize);
			// context.save();
			context.beginPath();
			context.moveTo(radius, 0);
			context.lineTo(x2 - radius, 0);
			context.quadraticCurveTo(x2,0, x2,radius);
			context.lineTo(x2, y2 - radius);
			context.quadraticCurveTo(x2,y2, x2-radius,y2);
			context.lineTo(radius, y2);
			context.quadraticCurveTo(0,y2, 0,y2-radius);
			context.lineTo(0, radius);
			context.quadraticCurveTo(0,0, radius,0);

			context.drawImage(pic, 0, 0, sWidth, sHeight, dX, dY, dWidth, dHeight);
			// context.restore();
		};
		pic.src = imageURL;
	};

	var RenderCompanyLogo = function(canvas, logoPath, userName, userNameLast)
	{
		if((logoPath == "empty") || (logoPath === ""))
		{
			// --- canvas.canvas.width returning width of canvas
			DrawTextLogo(canvas, GetUserInitials(userName, userNameLast), canvas.canvas.width);
		}
		else
		{
			DrawCompanyImage(canvas, logoPath, canvas.canvas.width);
		}
	};

	var	GetItemFromArrayByID = function(__array, id, id_field_name)
	{
		var result = null;
		var	item;

		if(!id_field_name) id_field_name = "id";

		if(__array)
		{
			for (var i = __array.length - 1; i >= 0; i--) {
				item = __array[i];
				if(Object.prototype.hasOwnProperty.call(item, id_field_name) && item[id_field_name] == id)
				{
					result = item;
					break;
				}
			}
		}

		return result;
	};

	var	GetAvatarsList = function(usersArray)
	{
		var		guestAvatarsList = $();

		usersArray.forEach(function(user) 
			{
				if(user.name.length || user.nameLast.length)
				{
					var		spanContainer	= $("<span>")	.data("obj", user);
					var		href			= $("<a>")		.attr("href", "/userprofile/" + user.id + "?rand=" + system_calls.GetUUID());
					var		canvas			= $("<canvas>")	.attr("height", "30")
															.attr("width", "30");

					DrawUserAvatar(canvas[0].getContext("2d"), user.avatar, user.name, user.nameLast);

					canvas		
								.attr("data-placement", "top")
								.attr("title", user.name + " " + user.nameLast)
								.tooltip({ animation: "animated bounceIn"});

					spanContainer.append(href.append(canvas)).append(" ");

					guestAvatarsList = guestAvatarsList.add(spanContainer);
				}
			});

		return	guestAvatarsList;		
	};
	// --- avatar part end



	// --- rating rendering
	// --- input: 
	// ---			additionalClass - could be used to find all ratings for the same entity 
	// ---			initValue - currently selected element
	// ---			callBack - function to call after change rating
	// --- output: DOMmodel
	var	RenderRating = function(additionalClass, initValue, callbackFunc)
	{
		var		RatingSelectionItem = function()
		{
			var		currTag = $(this);
			var		currRating = currTag.data("rating");

			callbackFunc(currRating);
		};

		var		uniqueID = "";

		do
		{
			uniqueID = Math.floor(Math.random() * 100000000);
		} while($("div#rating" + uniqueID).length);


		var		bookRating = $("<div>").addClass("rating")
									.addClass(additionalClass)
									.attr("id", "rating" + uniqueID);
		var		star5 = $("<input>").attr("type", "radio")
									.attr("id", "rating_5_" + uniqueID)
									.attr("data-rating", "5")
									.on("click", RatingSelectionItem)
									.attr("name", "rating" + uniqueID);
		var		star4 = $("<input>").attr("type", "radio")
									.attr("id", "rating_4_" + uniqueID)
									.attr("data-rating", "4")
									.on("click", RatingSelectionItem)
									.attr("name", "rating" + uniqueID);
		var		star3 = $("<input>").attr("type", "radio")
									.attr("id", "rating_3_" + uniqueID)
									.attr("data-rating", "3")
									.on("click", RatingSelectionItem)
									.attr("name", "rating" + uniqueID);
		var		star2 = $("<input>").attr("type", "radio")
									.attr("id", "rating_2_" + uniqueID)
									.attr("data-rating", "2")
									.on("click", RatingSelectionItem)
									.attr("name", "rating" + uniqueID);
		var		star1 = $("<input>").attr("type", "radio")
									.attr("id", "rating_1_" + uniqueID)
									.attr("data-rating", "1")
									.on("click", RatingSelectionItem)
									.attr("name", "rating" + uniqueID);
		var		label5 = $("<label>").attr("for", "rating_5_" + uniqueID)
									.attr("title", "супер !")
									.tooltip({ animation: "animated bounceIn", placement: "top" });
		var		label4 = $("<label>").attr("for", "rating_4_" + uniqueID);
		var		label3 = $("<label>").attr("for", "rating_3_" + uniqueID);
		var		label2 = $("<label>").attr("for", "rating_2_" + uniqueID);
		var		label1 = $("<label>").attr("for", "rating_1_" + uniqueID)
									.attr("title", "не понравилось")
									.tooltip({ animation: "animated bounceIn", placement: "top" });


		bookRating	.append(star5).append(label5)
					.append(star4).append(label4)
					.append(star3).append(label3)
					.append(star2).append(label2)
					.append(star1).append(label1);

		if(initValue == 1) star1.attr("checked", true);
		if(initValue == 2) star2.attr("checked", true);
		if(initValue == 3) star3.attr("checked", true);
		if(initValue == 4) star4.attr("checked", true);
		if(initValue == 5) star5.attr("checked", true);

		return bookRating;
	};


	var	GetActiveRibbon = function(ribbons)
	{
		return ribbons[0];
	};

	// --- canvas required to calculate proper ribbon size 
	var	GetRibbon_DOM = function(ribbons)
	{
		var DrawRibbon = function(ribbon)
		{
			return $("<img>")
							.attr("src", ribbon.image)
							.css("position", "absolute")
							.css("top", "50%")
							.css("left", "50%")
							.css("max-height", "50%")
							.css("max-width", "50%")
							;
		};

		if(ribbons && ribbons.length)
		{
			var ribbon = GetActiveRibbon(ribbons);

			return DrawRibbon(ribbon);
		}
	};


	var	ReplaceTextLinkToURL = function(srcText)
	{
		// --- url is everything before space or HTML-tag (for example: <br>)
		var		urlRegEx = /(https?:\/\/[^\s<]+)/g;
		var		resultText;

		resultText = srcText.replace(urlRegEx, function(url) {
			var		urlText = url;

			if(url.length > 32) urlText = url.substring(0, 32) + " ...";

			return "<a href=\"" + url + "\" target=\"blank\">" + urlText + "</a>"; 
		});

		return resultText;
	};

	var LongestWord = function(text)
	{
		var	lenghtyWord = "";
		var	lenghtyWordIdx = 0;
		var	wordsArr;

		// --- remove www links
		text = text.replace(/https?:\/\/[^\s<]+/g, "");
		wordsArr = text.match(/[^\s]+/g) || [""];

		wordsArr.forEach(function (item, i) { if(item.length >= lenghtyWord.length) { lenghtyWord = item; lenghtyWordIdx = i; } });

		return wordsArr[lenghtyWordIdx];
	};

	var LongestWordSize = function(text)
	{
		var	lenghtyWord = LongestWord(text);

		return lenghtyWord.length;
	};

	// --- output:
	//	 if empty - URL is valid
	//	 if not empty - error message
	var isValidURL = function(url)
	{
		var	result = "";

		if(url.length === 0)
		{
			result = "пустой URL";
		}
		else if((url.toLowerCase().indexOf("http://") == -1) && (url.toLowerCase().indexOf("https://") == -1))
		{
			result = "не указано http:// или https://";
		}

		return result;
	};

	var	ArrayLeftIntersection = function(arr1, arr2)
	{
		var	result = [];
		var	intersection = [];

		for(var i = 0; i < arr1.length; ++i)
		{
			intersection[arr1[i]] = true;
		}

		for(i = 0; i < arr2.length; ++i)
		{
			if(intersection[arr2[i]]) delete(intersection[arr2[i]]);
		}

		for(var value in intersection)
		{
			result.push(value);
		}

		return result;
	};

	var	ArrayRightIntersection = function(arr1, arr2)
	{
		return ArrayLeftIntersection(arr2, arr1);
	};

	var	ArrayOuterIntersection = function(arr1, arr2)
	{
		return ArrayLeftIntersection(arr1, arr2).concat(ArrayRightIntersection(arr1, arr2));
	};

	var	ArrayInnerIntersection = function(arr1, arr2)
	{
		var	result = [];
		var	intersection = [];

		for(var i = 0; i < arr1.length; ++i)
		{
			intersection[arr1[i]] = true;
		}

		for(i = 0; i < arr2.length; ++i)
		{
			if(intersection[arr2[i]]) result.push(arr2[i]);
		}

		return result;
	};

	var	isTagFullyVisibleInWindowByHeight = function(tag)
	{
		var		windowTop		= $(window).scrollTop();
		var		windowBottom	= windowTop + document.documentElement.clientHeight;

		var		tagTop			= tag.offset().top;
		var		tagBottom		= tagTop + tag.height();

		var		result			=
									(windowTop <= tagTop) && (tagTop <= windowBottom) &&
									(windowTop <= tagBottom) && (tagBottom <= windowBottom)
									;
		return result;
	};

	var ClearSession = function()
	{
		$.removeCookie("sessid");
		// localStorage.removeItem("sessid");

		// --- Back button will not work (prefer method, to avoid hacking)
		// window.location.replace("/?rand=" + Math.random()*98765432123456);

		// --- Like click on the link
		// window.location.href = "/?rand=" + Math.random()*98765432123456;

	};

	return {
		Init: Init,
		companyTypes: companyTypes,
		isUserSignedin: isUserSignedin,
		SendEchoRequest: SendEchoRequest,
		GetUserRequestNotifications: GetUserRequestNotifications,
		isTouchBasedUA: isTouchBasedUA,
		CutLongMessages: CutLongMessages,
		RemoveSpaces: RemoveSpaces,
		isOrientationLandscape: isOrientationLandscape,
		isOrientationPortrait: isOrientationPortrait,
		ConvertTextToHTML: ConvertTextToHTML,
		ConvertHTMLToText: ConvertHTMLToText,
		ConvertMonthNameToNumber: ConvertMonthNameToNumber,
		ConvertMonthNumberToAbbrName: ConvertMonthNumberToAbbrName,
		ConvertDateSQLToHuman: ConvertDateSQLToHuman,
		ConvertDateRussiaToHuman: ConvertDateRussiaToHuman,
		ConvertDateRussiaToHumanWithoutYear: ConvertDateRussiaToHumanWithoutYear,
		ConvertDateRussiaToHumanFullMonth: ConvertDateRussiaToHumanFullMonth,
		FilterUnsupportedUTF8Symbols: FilterUnsupportedUTF8Symbols,
		GetLocalizedWorkDurationFromDelta: GetLocalizedWorkDurationFromDelta,
		GetLocalizedDateFromSeconds: GetLocalizedDateFromSeconds,
		GetLocalizedDateNoTimeFromSeconds: GetLocalizedDateNoTimeFromSeconds,
		GetLocalizedDateFromDelta: GetLocalizedDateFromDelta,
		GetLocalizedDateInHumanFormatSecSince1970:GetLocalizedDateInHumanFormatSecSince1970,
		GetLocalizedDateInHumanFormatMsecSinceEvent:GetLocalizedDateInHumanFormatMsecSinceEvent,
		GetLocalizedRUFormatDateNoTimeFromSeconds: GetLocalizedRUFormatDateNoTimeFromSeconds,
		GetFormattedDateFromSeconds: GetFormattedDateFromSeconds,
		GetYearsSpelling: GetYearsSpelling,
		GetGenderedPhrase: GetGenderedPhrase,
		GetGenderedActionCategoryTitle: GetGenderedActionCategoryTitle,
		GetGenderedActionTypeTitle: GetGenderedActionTypeTitle,
		GetSQLFormatedDateNoTimeFromSeconds: GetSQLFormatedDateNoTimeFromSeconds,
		UpdateInputFieldOnServer: UpdateInputFieldOnServer,
		FriendshipButtonClickHandler: FriendshipButtonClickHandler,
		GlobalBuildFoundFriendSingleBlock: GlobalBuildFoundFriendSingleBlock,
		BuildCompanySingleBlock: BuildCompanySingleBlock,
		BuildGroupSingleBlock: BuildGroupSingleBlock,
		RenderFriendshipButtons: RenderFriendshipButtons,
		PrebuiltInitValue:PrebuiltInitValue,
		ScrollWindowToElementID: ScrollWindowToElementID,
		GetParamFromURL: GetParamFromURL,
		RenderCompanyLogo: RenderCompanyLogo,
		GetIntoPublicZone: GetIntoPublicZone,
		GetUUID: GetUUID,
		GetMinutesSpelling: GetMinutesSpelling,
		GetHoursSpelling: GetHoursSpelling,
		GetDaysSpelling: GetDaysSpelling,
		GetMonthsSpelling: GetMonthsSpelling,
		GetTodaysYear: GetTodaysYear,

		GetItemFromArrayByID:GetItemFromArrayByID, 

		GetAvatarsList: GetAvatarsList,
		GetRibbon_DOM: GetRibbon_DOM,

		PopoverError: PopoverError,
		PopoverInfo: PopoverInfo,
		AlertError: AlertError,
		RenderRating: RenderRating,
		ReplaceTextLinkToURL: ReplaceTextLinkToURL,
		LongestWordSize: LongestWordSize,
		LongestWord: LongestWord,
		isValidURL: isValidURL,

		ArrayLeftIntersection:ArrayLeftIntersection,
		ArrayRightIntersection:ArrayRightIntersection,
		ArrayOuterIntersection:ArrayOuterIntersection,
		ArrayInnerIntersection:ArrayInnerIntersection,
		isTagFullyVisibleInWindowByHeight: isTagFullyVisibleInWindowByHeight,

		copyToClipboard: copyToClipboard,

		ClearSession: ClearSession
	};
}
)();

// --- use cache carefully !
// --- cache is not updating edit_profile user_changes 
var userCache = (function()
{
	"use strict";
	var		cache = []; // --- main storage
	var		userCacheFutureUpdateArr = []; // --- used for update userCache object with new users
	var		callbackRunAfterUpdateArr = []; 
	var		runLock = false; // --- semaphore for racing conditions

	var		UpdateWithUser = function(userObj)
	{
		var		updatedFlag = false;
		
		cache.forEach(function(item, i)
			{
				if(cache[i].id == userObj.id)
				{
					cache[i] = item;
					updatedFlag = true;
				}
			});

		if(!updatedFlag) cache.push(userObj);
	};

	var		GetUserByID = function(userID)
	{
		var		result = {};

		cache.forEach(function(item)
			{
				if(item.id == userID)
				{
					result = item;
				}
			});

		return result;
	};

	var		isUserCached = function(userID)
	{
		var		result = false;

		cache.forEach(function(item)
			{
				if(item.id == userID)
				{
					result = true;
				}
			});

		return result;
	};

	var 	AddUserIDForFutureUpdate = function(userID)
	{
		userCacheFutureUpdateArr.push(userID);
	};

	var		AddCallbackRunsAfterCacheUpdate = function(func)
	{
		var		updateFlag = true;

		// --- add callback function just in case userscache not empty
		// --- otherwise there is no value to run callback without any changes
		if(userCacheFutureUpdateArr.length)
		{
			callbackRunAfterUpdateArr.forEach(function(item)
			{
				if(item == func) updateFlag = false;
			});

			if(updateFlag) callbackRunAfterUpdateArr.push(func);
		}
	};

	var		RequestServerToUpdateCache = function()
	{
		if(!runLock)
		{
			runLock = true; // --- lock-on, otherwise callbacklist will be cleared.

			// --- following two lines trying to speedup operations with userCacheUpdateArr 
			// --- to reduce probability of racing conditions
			var		param1 = userCacheFutureUpdateArr.join();
			userCacheFutureUpdateArr = []; 	// --- avoid repeating requests to server

			if(param1.length)
			{
				$.getJSON("/cgi-bin/system.cgi", { action: "GetUserInfo", userID: param1 })
					.done(
						function(result)
						{
							if((result.session == "true") && (result.user == "true") && (result.type == "UserInfo"))
							{
								result.userArray.forEach(function(item)
								{
									UpdateWithUser(item);
								});

								callbackRunAfterUpdateArr.forEach(function(item)
								{
									item();
								});
								callbackRunAfterUpdateArr = []; // --- safety measures to avoid repeated calling callback functions

							}

							runLock = false;
						});	
			}
			else
			{
				callbackRunAfterUpdateArr.forEach(function(item)
				{
					item();
				});
				callbackRunAfterUpdateArr = []; // --- safety measures to avoid repeated calling callback functions
				runLock = false;
			} // --- if userCacheFutureUpdateArr not empty
		} // --- run lock
	};

	return {
		// cache: cache,
		UpdateWithUser: UpdateWithUser,
		GetUserByID: GetUserByID,
		isUserCached: isUserCached,
		AddUserIDForFutureUpdate: AddUserIDForFutureUpdate,
		AddCallbackRunsAfterCacheUpdate: AddCallbackRunsAfterCacheUpdate,
		RequestServerToUpdateCache: RequestServerToUpdateCache
	};
})();

// --- build "chat" buttons and put them into DOM-model
// --- input
// ---		friendInfo - info from GetUserListInJSONFormat
// ---		housingTag - tag where buttons have to be placed to
var RenderChatButton = function(friendInfo, housingTag)
{
	"use strict";
	// var		buttonChat = $("<button>").append($("<img>").attr("src", "/images/pages/common/chat.png").addClass("width_18"))
	var		buttonChat = $("<button>").append($("<span>").addClass("fa fa-comment-o fa-lg width_18"))
										.addClass("btn btn-primary");

	Object.keys(friendInfo).forEach(function(itemChild) {
		buttonChat.data(itemChild, friendInfo[itemChild]);
	});

	buttonChat.on("click", ChatButtonClickHandler);

	housingTag.append(buttonChat);
};

var ChatButtonClickHandler = function()
{
	"use strict";
	var		button = $(this);

	window.location.href = "/chat/" + button.data("id") + "?rand=" + Math.floor(Math.random() * 1000000000);
};


var	ButtonFriendshipRemovalYesHandler = function()
{
	"use strict";
	var clickedButton = $(this).data("clickedButton");
	clickedButton.data("action", "disconnect");
	$("#DialogFriendshipRemovalYesNo").modal("hide");
	clickedButton.click();
};

// --- avatar part start
var GetUserInitials = function(firstName, lastName)
{
	"use strict";
	var	result = "";

	if(typeof(firstName) != "undefined")
	{
		if(firstName.length > 0) { result += firstName[0]; }
	}
	if(typeof(lastName) != "undefined")
	{
		if(lastName.length > 0) { result += lastName[0]; }
	}

	return result;
};

var DrawTextAvatar = function(context, userInitials, size)
{
	"use strict";
	var		avatarSize = size;
	
	context.clearRect(0, 0, avatarSize, avatarSize);

	context.beginPath();
	context.arc(avatarSize/2,avatarSize/2, avatarSize/2, 0,2*Math.PI);
	context.closePath();
	context.fillStyle = "grey";
	context.fill();

	context.font = "normal "+avatarSize*3/8+"pt Calibri";
	context.textAlign = "center";
	context.fillStyle = "white";
	context.fillText(userInitials, avatarSize/2,avatarSize*21/32);
};

var DrawTextLogo = function(context, userInitials, size)
{
	"use strict";
	var		avatarSize = size;
	
	context.clearRect(0, 0, avatarSize, avatarSize);

	context.beginPath();
	context.rect(0, 0, avatarSize, avatarSize);
	context.closePath();
	context.fillStyle = "grey";
	context.fill();

	context.font = "normal "+avatarSize*3/8+"pt Calibri";
	context.textAlign = "center";
	context.fillStyle = "white";
	context.fillText(userInitials, avatarSize/2,avatarSize*21/32);
};

var DrawPictureAvatar = function(context, imageURL, avatarSize)
{
	"use strict";

	var x2 = avatarSize, y2 = avatarSize, radius = avatarSize / 8;
	var		pic = new Image();

	pic.src = imageURL;
	pic.onload = function() { 
		var		sMinEdge = Math.min(pic.width, pic.height);


		context.clearRect(0,0,avatarSize,avatarSize);
		context.save();
		context.beginPath();
		context.moveTo(radius, 0);
		context.lineTo(x2 - radius, 0);
		context.quadraticCurveTo(x2,0, x2,radius);
		context.lineTo(x2, y2 - radius);
		context.quadraticCurveTo(x2,y2, x2-radius,y2);
		context.lineTo(radius, y2);
		context.quadraticCurveTo(0,y2, 0,y2-radius);
		context.lineTo(0, radius);
		context.quadraticCurveTo(0,0, radius,0);
		context.clip();

		context.drawImage(pic, (pic.width - sMinEdge) / 2, (pic.height - sMinEdge) / 2, sMinEdge, sMinEdge, 0, 0, avatarSize, avatarSize);
		context.restore();
	};
};

var	DrawCompanyLogoAvatar = function(context, imageURL, avatarSize)
{
	"use strict";

	var		pic = new Image();

	pic.src = imageURL;
	pic.onload = function() { 
		var		sMaxEdge = Math.max(pic.width, pic.height);
		var		scale = sMaxEdge / avatarSize;
		var		dWidth = pic.width / scale;
		var		dHeight = pic.height / scale;

		context.clearRect(0,0,avatarSize,avatarSize);
		context.save();
		context.beginPath();
		// --- company logo should not have rounded corners
/*
		context.moveTo(radius, 0);
		context.lineTo(x2 - radius, 0);
		context.quadraticCurveTo(x2,0, x2,radius);
		context.lineTo(x2, y2 - radius);
		context.quadraticCurveTo(x2,y2, x2-radius,y2);
		context.lineTo(radius, y2);
		context.quadraticCurveTo(0,y2, 0,y2-radius);
		context.lineTo(0, radius);
		context.quadraticCurveTo(0,0, radius,0);
		context.clip();
*/
		// context.drawImage(pic, (pic.width - sMaxEdge) / 2, (pic.height - sMaxEdge) / 2, sMaxEdge, sMaxEdge, 0, 0, avatarSize, avatarSize);
		context.drawImage(pic, 0, 0, pic.width, pic.height, (avatarSize - dWidth) / 2, (avatarSize - dHeight) / 2, dWidth, dHeight);
		context.restore();
	};
};

var DrawUserAvatar = function(canvas, avatarPath, userName, userNameLast)
{
	"use strict";

	if((avatarPath == "empty") || (avatarPath === ""))
	{
		// --- canvas.canvas.width returning width of canvas
		DrawTextAvatar(canvas, GetUserInitials(userName, userNameLast), canvas.canvas.width);
	}
	else
	{
		DrawPictureAvatar(canvas, avatarPath, canvas.canvas.width);
	}
};

// --- difference from user:
// --- user avatar - fit into quad with shortest side (crop other dimension)
// --- company log - fit into quad with longest side (no crop)
// --- INPUT:
//			usually userNameLast = ""
var DrawCompanyAvatar = function(canvas, avatarPath, userName, userNameLast)
{
	"use strict";

	if((avatarPath == "empty") || (avatarPath === ""))
	{
		// --- canvas.canvas.width returning width of canvas
		DrawTextLogo(canvas, GetUserInitials(userName, userNameLast), canvas.canvas.width);
	}
	else
	{
		DrawCompanyLogoAvatar(canvas, avatarPath, canvas.canvas.width);
	}
};
// --- avatar part end


var BuildUserRequestList = function()
{
	"use strict";

	var		resultDOM = $();
	var		userCounter = 0;

	var CutUserName19Symbols = function(userName)
	{
		if(userName.length > 19)
		{
			return userName.substr(0, 19) + "...";
		}

		return userName;
	};


	// console.debug("BuildUserRequestList: start");

	userRequestList.friendshipNotificationsArray.forEach(
		function(item, i, arr)
		{

			$.getJSON(
				"/cgi-bin/system.cgi",
				{ action: "GetUserInfo", userID: item.friendID }
			)
			.done(
				function(result)
				{
					var		userInfo = result.userArray[0];
					var		userSpan = $("<span/>").addClass("RequestUserListSpan");
					var		buttonSpan = $("<span/>");
					var		liUser = $("<li/>").addClass("dropdown-menu-li-higher");
					var		liDivider = $("<li/>").addClass("divider");
					var		buttonAccept = $("<button>").addClass("btn btn-primary")
														.append("Принять")
														.data("action", "confirm");
					var		buttonReject = $("<button>").addClass("btn btn-default")
														.append("Отказаться")
														.data("action", "disconnect");
					var		canvasAvatar = $("<canvas/>")	.attr("width", "30")
															.attr("height", "30")
															.addClass("canvas-big-avatar")
															.addClass("RequestUserListOverrideCanvasSize");

					// --- update cache with this user
					userCache.UpdateWithUser(userInfo);

					// --- use the global counter due to getJSON may be returned not in right order
					// --- firstly for user #2
					// --- secondly for user #1
					userCounter++;

					Object.keys(userInfo).forEach(function(itemChild) {
						buttonReject.data(itemChild, userInfo[itemChild]);
						buttonAccept.data(itemChild, userInfo[itemChild]);
					});

					buttonReject.on("click", system_calls.FriendshipButtonClickHandler);
					buttonAccept.on("click", system_calls.FriendshipButtonClickHandler);


					resultDOM = resultDOM.add(liUser);

					var hrefTemp = $("<a/>").attr("href", "/userprofile/" + userInfo.id)
											.addClass("RequestUserListHrefLineHeigh")
											.append(CutUserName19Symbols(userInfo.name + " " + userInfo.nameLast));
					userSpan.append(canvasAvatar)
							.append(hrefTemp)
							.append(buttonSpan);
					buttonSpan
							.append(buttonAccept)
							.append(" ")
							.append(buttonReject);

					DrawUserAvatar(canvasAvatar[0].getContext("2d"), userInfo.avatar, userInfo.name, userInfo.nameLast);

					liUser.append(userSpan);

					if(userCounter < arr.length)
					{
						resultDOM = resultDOM.add(liDivider);
					}
		
					if(userCounter == arr.length)
					{
						$("#user-requests-ul").empty()
												.append(resultDOM);
					}
					
				}
			);


		}
	);
};

navMenu_search = (function() 
{
	"use strict";

	var	AutocompleteSelectHandler = function(event, ui)
	{
		var	selectedID = ui.item.id;

		window.location.href = "/userprofile/" + selectedID;
	};

	var OnKeyupHandler = function(event)
	{
		var	keyPressed = event.keyCode;

		if(keyPressed == 13) {
			/*Enter pressed*/
			$("#navMenuSearchText").autocomplete("close");
			// FindFriendsFormSubmitHandler();
		}
	};

	var OnSubmitClickHandler = function()
	{
		var		searchText = $("#navMenuSearchText").val();

		if(searchText.length <= 2)
		{
			$("#navMenuSearchText").attr("title", "Напишите более 2 букв")
									.attr("data-placement", "bottom")
									.tooltip("show");
			window.setTimeout(function()
				{
					$("#navMenuSearchText").tooltip("destroy");
				}, 3000);
			return false;
		}
	};

	return {
		AutocompleteSelectHandler: AutocompleteSelectHandler,	
		OnKeyupHandler: OnKeyupHandler,
		OnSubmitClickHandler: OnSubmitClickHandler
	};
}
)();

navMenu_chat = (function()
{
	"use strict";

	var	userArray = [];
	var	unreadMessagesArray = [];

	var	UnreadMessageButtonClickHandler = function()
	{
		console.debug("navMenu_chat.UnreadMessageButtonClickHandler: start");

		console.debug("navMenu_chat.UnreadMessageButtonClickHandler: start");
	};

	var CutLongMultilineMessages = function(message)
	{
		var		lineList;
		var		cutMessage = [];
		
		lineList = message;
		lineList = lineList.replace(/&ishort;/g, "й");
		lineList = lineList.replace(/&euml;/g, "ё");
		lineList = lineList.replace(/&zsimple;/g, "з");
		lineList = lineList.replace(/&Ishort;/g, "Й");
		lineList = lineList.replace(/&Euml;/g, "Ё");
		lineList = lineList.replace(/&Zsimple;/g, "З");
		lineList = lineList.replace(/&Norder;/g, "№");
		lineList = lineList.replace(/<br>/g, "\n").replace(/\r/g, "").split("\n");

		lineList.forEach(function(item, i)
			{
				if(i < 3) 
				{
					cutMessage.push(item.substr(0,45) + (item.length > 45 ? " ..." : ""));
				}
			});
		if(lineList.length > 3)
		{
			cutMessage.push("...");
		}

		return cutMessage.join("<br>");
	};
	
	var	BuildUnreadMessageList = function()
	{

		var		resultDOM = $();
		var		messageCounter = 0;


		if(!unreadMessagesArray.length)
		{
			$("#user-chat-ul").empty();
		}
		unreadMessagesArray.forEach(
			function(item, i, arr)
			{
				if(i < 5)
				{

					var		messageInfo = item;
					var		userInfo = jQuery.grep(userArray, function(n) { return (n.id == messageInfo.fromID); });
							userInfo = userInfo[0];
					var		userSpan = $("<div/>").addClass("UnreadChatListSpan");
					var		buttonSpan = $("<span/>").addClass("UnreadChatListButtonSpan");
					var		liUser = $("<li/>").addClass("dropdown-menu-li-higher")
												.addClass(messageInfo.messageStatus);
					var		liDivider = $("<li/>").addClass("divider");
					var		buttonReply = $("<button>")	.addClass("btn btn-link")
														.append($("<span>").addClass("glyphicon glyphicon-pencil"))
														.data("action", "reply")
														.on("click", function(e) 
															{
																var		newURL =  "/chat/" + messageInfo.fromID + "?rand=" + Math.random()*98765432123456;
																window.location.href = newURL;
																e.stopPropagation(); 
															});
					var		buttonClose = $("<button>")	.addClass("btn btn-link")
														.append($("<span>").addClass("glyphicon glyphicon-remove"))
														.data("action", "markAsRead")
														.on("click", function(e) 
															{
																$.getJSON("/cgi-bin/index.cgi", {action:"AJAX_chatMarkMessageReadByMessageID", messageid:messageInfo.id})
																			.done(function(data) 
																				{
																					if(data.result == "success")
																					{
																						GetUserChatMessages();
																					}
																					else
																					{
																						console.debug("AJAX_chatMarkMessageReadByMessageID: ERROR: " + data.description);
																					}
																				});

																e.stopPropagation(); 
															});
					var		canvasAvatar = $("<canvas/>")	.attr("width", "30")
															.attr("height", "30")
															.addClass("canvas-big-avatar")
															.addClass("UnreadChatListOverrideCanvasSize");
					var		messageBody = $("<div>").addClass("UnreadChatListMessage")
														.on("click", function(e) 
															{ 
																window.location.href = "/chat/" + messageInfo.fromID + "?rand=" + Math.random()*98765432123456; 
																e.stopPropagation();
															});

					messageCounter++;

					Object.keys(messageInfo).forEach(function(itemChild) {
						buttonClose.data(itemChild, messageInfo[itemChild]);
						buttonReply.data(itemChild, messageInfo[itemChild]);
					});

					buttonClose.on("click", UnreadMessageButtonClickHandler);
					buttonReply.on("click", UnreadMessageButtonClickHandler);

					resultDOM = resultDOM.add(liUser);

					var hrefTemp = $("<a/>").attr("href", "/userprofile/" + userInfo.id)
							.addClass("UnreadChatListHrefLineHeigh")
							.append(system_calls.CutLongMessages(userInfo.name + " " + userInfo.nameLast));
					userSpan.append(canvasAvatar)
							.append(hrefTemp)
							.append(buttonSpan);
					buttonSpan
							.append(buttonReply)
							.append(" ")
							.append(buttonClose);

					messageBody.append((item.messageType == "text" ? CutLongMultilineMessages(item.message) : "<i>Вам прислали картинку</i>"));

					DrawUserAvatar(canvasAvatar[0].getContext("2d"), userInfo.avatar, userInfo.name, userInfo.nameLast);

					liUser	.append(userSpan)
							.append($("<br/>"))
							.append($("<br/>"))
							.append(messageBody);

					if((messageCounter < arr.length) && (messageCounter < 5))
					{
						resultDOM = resultDOM.add(liDivider);
					}
		
					if((messageCounter == arr.length) || (messageCounter == 5))
					{
						$("#user-chat-ul").empty()
											.append(resultDOM);

						// --- if number of unread messages > allowed to display
						if((arr.length - 1) > messageCounter)
						{
							var		liSystemMessage = $("<li/>").addClass("dropdown-menu-li-higher")
																.addClass(messageInfo.messageStatus)
																.append("<div class=\"text_align_center\"><i><a href=\"/chat?rand=" + Math.random()*98765432123456 + "\">еще сообщения</a></i></div>");

							$("#user-chat-ul").append(liDivider).append(liSystemMessage);
						}
					}
				}
			});

	};

	var GetUserChatMessages = function()
	{
		if(system_calls.isUserSignedin())
		{
			$.getJSON(
				"/cgi-bin/system.cgi",
				{action:"GetNavMenuChatStatus"})
				.done(function(data) 
					{
						if(data.type == "ChatStatus")
						{
							if(data.session == "true")
							{
								if(data.user == "true")
								{

									var	badgeSpan = $("<span/>").addClass("badge")
																.addClass("badge-danger");

									userArray = data.userArray;
									unreadMessagesArray = data.unreadMessagesArray;
									if(unreadMessagesArray.length)
									{
											badgeSpan.append(unreadMessagesArray.length);
									}

									// console.debug("GetUserChatMessages: DoneHandler: put a badge [" + unreadMessagesArray.length + "]");

									$("#user-chat-ahref .badge").remove();
									$("#user-chat-ahref").append(badgeSpan);

									BuildUnreadMessageList();
								}
								else
								{
									// --- workflow can get here just in case 
									// --- 	1) EchoRequest: session-ok, user-ok
									// ---	AND
									// ---	2) GetNavMenuChatStatus: session-ok, user-NOT_ok
									// --- it means:
									// ---	*) session expired in short period of time 
									// ---  OR
									// ---  *) iOS buggy behavior (assign old cookie in about 3 secs after page reload)
									console.error("GetUserChatMessages: DoneHandler: ERROR: guest user");
									system_calls.GetIntoPublicZone();
								} // --- if(data.user == "true")
							}
							else
							{
								console.error("GetUserChatMessages: DoneHandler: ERROR: session do not exists on server, session must be deleted, parent window must be redirected");

								system_calls.ClearSession();
								system_calls.GetIntoPublicZone();
							} // --- if(data.session == "true")
						} // --- if(data.type == "UnreadChatMessages")
					} // --- function(data)
				);

		} // --- if(system_calls.isUserSignedin())
		else
		{
			// --- user not signed in (no need to check notifications)
		}

		// --- check system notifications
		window.setTimeout(GetUserChatMessages, 60000);
	};

	var GetNumberOfUnreadMessages = function()
	{
		return unreadMessagesArray.length;
	};

	return {
		GetUserChatMessages: GetUserChatMessages,
		GetNumberOfUnreadMessages: GetNumberOfUnreadMessages
	};
}
)();

navMenu_userNotification = (function()
{
	"use strict";

	var		userNotificationsArray = []; // --- storing all notifications

	var	InitializeData = function (data)
	{
		userNotificationsArray = data;
	};

	var	ReplaceUserIDTagsToUserName = function(src)
	{
		var		result = src;
		var		userRegex = /@[0-9]+/g;
		var		matchArray = src.match(userRegex);
		var		userArray = [];

		// --- if users tags found in notification text
		if(matchArray)
		{		
			matchArray.forEach(function(item) 
				{
					// --- substring: @1030 -> 1030
					if(userCache.isUserCached(item.substr(1, item.length - 1)))
					{
						var 	user = userCache.GetUserByID(item.substr(1, item.length - 1));

						userArray["@" + user.id] = user.name + " " + user.nameLast;
					}
					else
					{
						userCache.AddUserIDForFutureUpdate(item.substr(1, item.length - 1));
					}
				});
		}

		Object.keys(userArray).forEach(function()
		{
			function convert(str, match)
			{
				return "<i>" + userArray[match] + "</i>";
			}
			result = result.replace(/(@\d+)/g, convert);
		});

		return result;
	};

	var	GetAdditionalTitle = function(notificationObj)
	{
		var		result = "";

		// --- comment provided
		if(notificationObj.notificationTypeID == "19")
		{
			if((typeof notificationObj.notificationCommentTitle != "undefined"))
			{
				result = ": &quot;" + ReplaceUserIDTagsToUserName(notificationObj.notificationCommentTitle) + "&quot;";
			}
		}
		// --- vacancy rejected 
		if(notificationObj.notificationTypeID == "59")
		{
			if((typeof notificationObj.notificationVacancy != "undefined") && notificationObj.notificationVacancy.length)
			{
				result = " " + notificationObj.notificationVacancy[0].company_position_title + "";
			}
		}


		return result;
	};

	var	BuildUserNotificationList = function()
	{

		var		resultDOM = $();
		var		notificationCounter = 0;

		if(userNotificationsArray.length === 0)
		{
			$("#user-notification-ul")
				.empty()
				.append($("<center>").append("нет новых извещений").addClass("color_grey"));
		}
		else
		{
			userNotificationsArray.forEach(
				function(item, i, arr)
				{
					var avatarLink;
					var hrefTemp;

					if(notificationCounter < 6)
					{

						var		notificationInfo = item;
						var		userSpan = $("<div/>").addClass("UnreadChatListSpan");
						var		liDivider = $("<li/>").addClass("divider");
						var		buttonSpan = $("<span/>").addClass("UnreadChatListButtonSpan");
						var		liUser = $("<li/>").addClass("dropdown-menu-li-higher")
													.addClass(notificationInfo.messageStatus);
						var		buttonReply = $("<button>")	.addClass("btn btn-link")
															.append($("<span>").addClass("glyphicon glyphicon-pencil"))
															.attr("data-action", "reply")
															.on("click", function(e) 
																{
																	var		newURL =  "/notification/" + notificationInfo.fromID + "?rand=" + Math.random()*98765432123456;
																	window.location.href = newURL;
																	e.stopPropagation(); 
																});
						var		buttonClose = $("<button>")	.attr("data-action", "markAsRead")
															.attr("id", "notifClose" + item.notificationID)
															.append($("<span>").addClass("glyphicon glyphicon-remove"))
															.addClass("btn btn-link")
															.on("click", function(e) 
																{
																	$.getJSON("/cgi-bin/index.cgi", {action:"AJAX_notificationMarkMessageReadByMessageID", notificationID:item.notificationID})
																				.done(function(data)
																					{
																						if(data.result == "success")
																						{
																							// --- good2go
																						}
																						else
																						{
																							console.debug("AJAX_notificationMarkMessageReadByMessageID: ERROR: " + data.description);
																						}
																					});

																	userNotificationsArray.forEach(function(item2, i2) 
																		{
																			if(userNotificationsArray[i2].notificationID == item.notificationID)
																			{
																				userNotificationsArray[i2].notificationStatus = "read";
																			}
																		});
																	BuildUserNotificationList();

																	e.stopPropagation(); 
																});
						var		canvasAvatar = $("<canvas/>")	.attr("width", "30")
																.attr("height", "30")
																.addClass("canvas-big-avatar")
																.addClass("UnreadChatListOverrideCanvasSize");
						var		messageBody = $("<div>").addClass("UnreadChatListMessage")
															.on("click", function(e) 
																{ 
																	window.location.href = "/user_notifications?scrollto=notificationInfo" + item.notificationID + "&rand=" + Math.random()*98765432123456; 
																	e.stopPropagation();
																});

						resultDOM = $();

						if((notificationCounter < arr.length) && (notificationCounter < 5) && (item.notificationStatus == "unread"))
						{
							var		notificationBody = "";

							Object.keys(notificationInfo).forEach(function(itemChild) {
								buttonClose.data(itemChild, notificationInfo[itemChild]);
								buttonReply.data(itemChild, notificationInfo[itemChild]);
							});

							if(notificationCounter) resultDOM = resultDOM.add(liDivider);
							resultDOM = resultDOM.add(liUser);

							if((typeof item.notificationFriendUserID != "undefined") || (typeof item.notificationFriendUserNameLast != "undefined") || (typeof item.notificationFriendUserNameLast != "undefined"))
							{
								avatarLink = "/userprofile/" + item.notificationFriendUserID + "?rand=" + system_calls.GetUUID();
								hrefTemp = $("<a>").attr("href", avatarLink)
										.addClass("UnreadChatListHrefLineHeigh")
										.append(system_calls.CutLongMessages(item.notificationFriendUserName + " " + item.notificationFriendUserNameLast));

								if(userCache.isUserCached(item.notificationFriendUserID))
								{
									var 	user = userCache.GetUserByID(item.notificationFriendUserID);
									DrawUserAvatar(canvasAvatar[0].getContext("2d"), user.avatar, user.name, user.nameLast);
								}
								else
								{
									userCache.AddUserIDForFutureUpdate(item.notificationFriendUserID);
									DrawUserAvatar(canvasAvatar[0].getContext("2d"), "", item.notificationFriendUserName, item.notificationFriendUserNameLast);
								}

								canvasAvatar.on("click", function(e) 
															{
																window.location.href = avatarLink; 
																e.stopPropagation();
															});

								userSpan.append(canvasAvatar)
										.append(hrefTemp);	

							}
							else if((typeof item.notificationFromCompany != "undefined") && (typeof item.notificationFromCompany[0].id != "undefined"))
							{
								avatarLink = "/companyprofile/" + item.notificationFromCompany[0].id + "?rand=" + system_calls.GetUUID();
								hrefTemp = $("<a>").attr("href", avatarLink)
										.addClass("UnreadChatListHrefLineHeigh")
										.append(system_calls.CutLongMessages(item.notificationFromCompany[0].name));

								if(item.notificationFromCompany[0].logo_folder.length && item.notificationFromCompany[0].logo_filename.length)
								{
									var		avatarPath = "/images/companies/" + item.notificationFromCompany[0].logo_folder + "/" + item.notificationFromCompany[0].logo_filename;
									DrawCompanyAvatar(canvasAvatar[0].getContext("2d"), avatarPath, item.notificationFromCompany[0].name, "");
								}

								canvasAvatar.on("click", function(e) 
															{
																window.location.href = avatarLink; 
																e.stopPropagation();
															});

								userSpan.append(canvasAvatar)
										.append(hrefTemp);	
							}

							userSpan.append(buttonSpan);
							buttonSpan.append(buttonClose);

							notificationBody = system_calls.GetGenderedPhrase(item, item.notificationCategoryTitle, item.notificationCategoryTitleMale, item.notificationCategoryTitleFemale) + " " + system_calls.GetGenderedPhrase(item, item.notificationTypeTitle, item.notificationTypeTitleMale, item.notificationTypeTitleFemale) + " ";

							if((item.notificationTypeID == "49") && (item.notificationCommentType == "likeBook"))
								notificationBody = "понравилась ваша любознательность ";
							if((item.notificationTypeID == "49") && (item.notificationCommentType == "likeUniversityDegree"))
								notificationBody = "поздравляет вас с получением степени ";
							if((item.notificationTypeID == "49") && (item.notificationCommentType == "likeCertification"))
								notificationBody = "поздравляет вас с получением сертификата ";
							if((item.notificationTypeID == "49") && (item.notificationCommentType == "likeCourse"))
								notificationBody = "поздравляет вас с прохождением курса ";
							if((item.notificationTypeID == "49") && (item.notificationCommentType == "likeLanguage"))
								notificationBody = "понравилась ваша способность изучения иностранного языка ";
							if((item.notificationTypeID == "49") && (item.notificationCommentType == "likeCompany"))
								notificationBody = "поздравляет вас с новой должностью ";

							if((item.notificationTypeID == "19") && (item.notificationCommentType == "book"))
								notificationBody = "коментарий на книгу ";
							if((item.notificationTypeID == "19") && (item.notificationCommentType == "university"))
								notificationBody = "коментарий на получение степени ";
							if((item.notificationTypeID == "19") && (item.notificationCommentType == "certification"))
								notificationBody = "коментарий на получение сертификата ";
							if((item.notificationTypeID == "19") && (item.notificationCommentType == "course"))
								notificationBody = "коментарий на посещение курса ";
							if((item.notificationTypeID == "19") && (item.notificationCommentType == "language"))
								notificationBody = "коментарий на изучение ин. языка ";
							if((item.notificationTypeID == "19") && (item.notificationCommentType == "company"))
								notificationBody = "коментарий на получение новой должности ";

							notificationBody += GetAdditionalTitle(item);

							messageBody.append(RenderMessageWithSpecialSymbols(notificationBody));


							liUser	.append(userSpan)
									.append($("<br/>"))
									.append($("<br/>"))
									.append(messageBody);


							if(!notificationCounter) $("#user-notification-ul").empty();
							$("#user-notification-ul").append(resultDOM);

							notificationCounter++;
						}
			
						if((notificationCounter == 5))
						{
							if(i < arr.length)
							{
								var		divDivider = $("<li/>").addClass("divider");
								$("#user-notification-ul").append(divDivider)
															.append($("<center>").addClass("cursor_pointer").append("еще . . ."));
							}
							notificationCounter++;
						}
					}
				});

			BadgeUpdate();

			userCache.AddCallbackRunsAfterCacheUpdate(navMenu_userNotification.BuildUserNotificationList);
			window.setTimeout(userCache.RequestServerToUpdateCache, 2000);
		}
	};

	var	BadgeUpdate = function()
	{

		var	badgeSpan = $("<span/>").addClass("badge")
									.addClass("badge-danger");
		var	countOnBadge = 0;

		if(userNotificationsArray.length > 0)
		{
			userNotificationsArray.forEach(function(item)
			{
				if(item.notificationStatus == "unread") countOnBadge++;
			});

			badgeSpan.append((countOnBadge > 20 ? "20+" : countOnBadge));
		}

		$("#user-notification-ahref .badge").remove();
		$("#user-notification-ahref").append(badgeSpan);
	};

	var RenderMessageWithSpecialSymbols = function(message)
	{
		var		lineList;
		var		cutMessage = [];
		
		lineList = message;
		lineList = lineList.replace(/&ishort;/g, "й");
		lineList = lineList.replace(/&euml;/g, "ё");
		lineList = lineList.replace(/&zsimple;/g, "з");
		lineList = lineList.replace(/&Ishort;/g, "Й");
		lineList = lineList.replace(/&Euml;/g, "Ё");
		lineList = lineList.replace(/&Zsimple;/g, "З");
		lineList = lineList.replace(/&Norder;/g, "№");
		lineList = lineList.replace(/<br>/g, "\n").replace(/\r/g, "").split("\n");

		lineList.forEach(function(item, i)
			{
				if(i < 3) 
				{
					cutMessage.push(item.substr(0,45) + (item.length > 45 ? " .!." : ""));
				}
			});
		if(lineList.length > 3)
		{
			cutMessage.push("...");
		}

		// return cutMessage.join("<br>");
		return lineList;
	};


	return {
		InitializeData: InitializeData,
		BuildUserNotificationList: BuildUserNotificationList,
		BadgeUpdate: BadgeUpdate,
		GetAdditionalTitle: GetAdditionalTitle
	};
})();


system_notifications = (function ()
{
	"use strict";

	var Display = function()
	{
		if(system_calls.isUserSignedin())
		{
			if (("Notification" in window)) 
			{
				if (Notification.permission === "granted") 
				{
					var	numberOfChatMessages = navMenu_chat.GetNumberOfUnreadMessages();
					if(numberOfChatMessages > 0)
					{
						var	currDate = new Date();
						var	currTimestamp = currDate.getTime() / 1000;

						var notificationShownTimestamp = 0;
						if(localStorage.getItem("notificationShownTimestamp"))
						{
							notificationShownTimestamp = parseFloat(localStorage.getItem("notificationShownTimestamp"));
						}

						if((currTimestamp - notificationShownTimestamp) > 24 * 3600)
						{
							var		notify, pronunciation;

							localStorage.setItem("notificationShownTimestamp", currTimestamp);

							if(numberOfChatMessages == 1) { pronunciation = " новое сообщение"; }
							if(numberOfChatMessages == 2) { pronunciation = " новых сообщения"; }
							if(numberOfChatMessages == 3) { pronunciation = " новых сообщения"; }
							if(numberOfChatMessages == 4) { pronunciation = " новых сообщения"; }
							if(numberOfChatMessages >= 5) { pronunciation = " новых сообщений"; }
							if(((numberOfChatMessages % 10) == 1) && (numberOfChatMessages > 19)) { pronunciation = " новое сообщение"; }
							if(((numberOfChatMessages % 10) == 2) && (numberOfChatMessages > 19)) { pronunciation = " новых сообщения"; }
							if(((numberOfChatMessages % 10) > 2) && (numberOfChatMessages > 19)) { pronunciation = " новых сообщений"; }
							if(((numberOfChatMessages % 10) > 0) && (numberOfChatMessages > 19)) { pronunciation = " новых сообщений"; }
							notify = new Notification("Вам письмо !", { icon: "/images/pages/chat/chat_notification_" + (Math.floor(Math.random() * 18) + 1) + ".png", body: "Вам прислали " + numberOfChatMessages + pronunciation } );
							notify.onclick = function() {
								notify.close();
								window.location.href = "/chat?rand=" + Math.random()*98765432123456;
							};
							setTimeout(function() { notify.close(); }, 10000);
						}
						else
						{
							// console.debug("system_notifications:Display: notification alerting once a day");
						}
					}
				}
				else
				{
					if (Notification.permission !== "denied") 
					{
						Notification.requestPermission();
					}
					else
					{
						console.debug("system_notifications:Display: ERROR: notifications rejected by user");
					}
				}
			}
			else
			{
				console.debug("system_notifications:Display: ERROR: browser don't support notifications");
			}
		}
		else
		{
			// --- user not signed in (no need to check notifications)
		}
	};

	return {
		Display: Display
	};
}
)();

troubleshooting = (function ()
{
	var		before_at = "issue";
	var		at_sign = "@";
	var		after_at = "timecard.su";
	var		Recipient = before_at + at_sign + after_at;

	var		GetTraceback = function()
	{
		var	traceback = "";

		var callback = function(stackframes) {
			var stringifiedStack = stackframes.map(function(sf) {
				return sf.toString();
			}).join("\n");
			traceback += stringifiedStack + "\n";

			return traceback;
		};

		var errback = function(err) { console.log(err.message); };

		return StackTrace.get().then(callback).catch(errback);
	};

	var		PopoverError = function(popover_tag_id, message_to_user, mail_subj, mail_body)
	{
		GetTraceback().then(function(traceback)
		{
			var		body = traceback;

			body += "\n\n" + mail_body;
			system_calls.PopoverError(popover_tag_id,
				message_to_user +
				"<a href=\"mailto:" + Recipient +
				"?subject=" + mail_subj +
				"&body=" + encodeURI(body) + "\">Сообщите</a> в тех поддержку.");
		});
	};

	return {
		PopoverError: PopoverError
	};
})();


/**
 * isMobile.js v0.4.1
 *
 * A simple library to detect Apple phones and tablets,
 * Android phones and tablets, other mobile devices (like blackberry, mini-opera and windows phone),
 * and any kind of seven inch device, via user agent sniffing.
 *
 * @author: Kai Mallea (kmallea@gmail.com)
 *
 * @license: http://creativecommons.org/publicdomain/zero/1.0/
 */
(function (global) {

	var apple_phone		 = /iPhone/i,
		apple_ipod			= /iPod/i,
		apple_tablet		= /iPad/i,
		android_phone		 = /(?=.*\bAndroid\b)(?=.*\bMobile\b)/i, // Match 'Android' AND 'Mobile'
		android_tablet		= /Android/i,
		amazon_phone		= /(?=.*\bAndroid\b)(?=.*\bSD4930UR\b)/i,
		amazon_tablet		 = /(?=.*\bAndroid\b)(?=.*\b(?:KFOT|KFTT|KFJWI|KFJWA|KFSOWI|KFTHWI|KFTHWA|KFAPWI|KFAPWA|KFARWI|KFASWI|KFSAWI|KFSAWA)\b)/i,
		windows_phone		 = /Windows Phone/i,
		windows_tablet		= /(?=.*\bWindows\b)(?=.*\bARM\b)/i, // Match 'Windows' AND 'ARM'
		other_blackberry	= /BlackBerry/i,
		other_blackberry_10 = /BB10/i,
		other_opera		 = /Opera Mini/i,
		other_chrome		= /(CriOS|Chrome)(?=.*\bMobile\b)/i,
		other_firefox		 = /(?=.*\bFirefox\b)(?=.*\bMobile\b)/i, // Match 'Firefox' AND 'Mobile'
		seven_inch = new RegExp(
			"(?:" +		 // Non-capturing group

			"Nexus 7" +	 // Nexus 7

			"|" +			 // OR

			"BNTV250" +	 // B&N Nook Tablet 7 inch

			"|" +			 // OR

			"Kindle Fire" + // Kindle Fire

			"|" +			 // OR

			"Silk" +		// Kindle Fire, Silk Accelerated

			"|" +			 // OR

			"GT-P1000" +	// Galaxy Tab 7 inch

			")",			// End non-capturing group

			"i");			 // Case-insensitive matching

	var match = function(regex, userAgent) {
		return regex.test(userAgent);
	};

	var IsMobileClass = function(userAgent) {
		var ua = userAgent || navigator.userAgent;

		// Facebook mobile app's integrated browser adds a bunch of strings that
		// match everything. Strip it out if it exists.
		var tmp = ua.split("[FBAN");
		if (typeof tmp[1] !== "undefined") {
			ua = tmp[0];
		}

		// Twitter mobile app's integrated browser on iPad adds a "Twitter for
		// iPhone" string. Same probable happens on other tablet platforms.
		// This will confuse detection so strip it out if it exists.
		tmp = ua.split("Twitter");
		if (typeof tmp[1] !== "undefined") {
			ua = tmp[0];
		}

		this.apple = {
			phone:  match(apple_phone, ua),
			ipod:   match(apple_ipod, ua),
			tablet: !match(apple_phone, ua) && match(apple_tablet, ua),
			device: match(apple_phone, ua) || match(apple_ipod, ua) || match(apple_tablet, ua)
		};
		this.amazon = {
			phone:  match(amazon_phone, ua),
			tablet: !match(amazon_phone, ua) && match(amazon_tablet, ua),
			device: match(amazon_phone, ua) || match(amazon_tablet, ua)
		};
		this.android = {
			phone:  match(amazon_phone, ua) || match(android_phone, ua),
			tablet: !match(amazon_phone, ua) && !match(android_phone, ua) && (match(amazon_tablet, ua) || match(android_tablet, ua)),
			device: match(amazon_phone, ua) || match(amazon_tablet, ua) || match(android_phone, ua) || match(android_tablet, ua)
		};
		this.windows = {
			phone:  match(windows_phone, ua),
			tablet: match(windows_tablet, ua),
			device: match(windows_phone, ua) || match(windows_tablet, ua)
		};
		this.other = {
			blackberry:   match(other_blackberry, ua),
			blackberry10: match(other_blackberry_10, ua),
			opera:		match(other_opera, ua),
			firefox:		match(other_firefox, ua),
			chrome:		 match(other_chrome, ua),
			device:		 match(other_blackberry, ua) || match(other_blackberry_10, ua) || match(other_opera, ua) || match(other_firefox, ua) || match(other_chrome, ua)
		};
		this.seven_inch = match(seven_inch, ua);
		this.any = this.apple.device || this.android.device || this.windows.device || this.other.device || this.seven_inch;

		// excludes 'other' devices and ipods, targeting touchscreen phones
		this.phone = this.apple.phone || this.android.phone || this.windows.phone;

		// excludes 7 inch devices, classifying as phone or tablet is left to the user
		this.tablet = this.apple.tablet || this.android.tablet || this.windows.tablet;

		if (typeof window === "undefined") {
			return this;
		}
	};

	var instantiate = function() {
		var IM = new IsMobileClass();
		IM.Class = IsMobileClass;
		return IM;
	};

	if (typeof module !== "undefined" && module.exports && typeof window === "undefined") {
		//node
		module.exports = IsMobileClass;
	} else if (typeof module !== "undefined" && module.exports && typeof window !== "undefined") {
		//browserify
		module.exports = instantiate();
	} else if (typeof define === "function" && define.amd) {
		//AMD
		define("isMobile", [], global.isMobile = instantiate());
	} else {
		global.isMobile = instantiate();
	}

})(this);


String.prototype.replaceAll = function(search, replacement) {
	var target = this;
	return target.split(search).join(replacement);
};

String.prototype.trimLeft = function(charlist) {
  if (charlist === undefined)
	charlist = "\\s";

  return this.replace(new RegExp("^[" + charlist + "]+"), "");
};

String.prototype.trimRight = function(charlist) {
  if (charlist === undefined)
	charlist = "\\s";

  return this.replace(new RegExp("[" + charlist + "]+$"), "");
};

String.prototype.trim = function(charlist) {
  return this.trimLeft(charlist).trimRight(charlist);
};

$.fn.selectRange = function(start, end) {
	var e = document.getElementById($(this).attr("id")); // I don't know why... but $(this) don't want to work today :-/
	if (!e) return;
	else if (e.setSelectionRange) { e.focus(); e.setSelectionRange(start, end); } /* WebKit */ 
	else if (e.createTextRange) { var range = e.createTextRange(); range.collapse(true); range.moveEnd("character", end); range.moveStart("character", start); range.select(); } /* IE */
	else if (e.selectionStart) { e.selectionStart = start; e.selectionEnd = end; }
};

$.urlParam = function(name)
{
	var results = new RegExp("[?&]" + name + "=([^&#]*)").exec(window.location.href);
	if (results === null){
		return "";
	}
	else{
		return decodeURI(results[1]) || "";
	}
};
