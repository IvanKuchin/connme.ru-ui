/* exported PreviewImageControl */
/* exported carousel_tools */

var PreviewImageControl = function ()
{
	"use strict";

	var		img_tag_global;
	var		rotation;
	var		scaleX, scaleY;

	var	Init = function(curr_tag)
	{
		img_tag_global = curr_tag;

		var regex = /exif_rotate-(\d+)/;
		var	regex_match = img_tag_global.attr("class").match(regex);

		img_tag_global.css({"left":"0px", "top":"0px"}); // --- reset drag-n-drop position
		rotation	= 0;
		scaleX		= 1;
		scaleY		= 1;

		if((typeof(regex_match) == "object") && regex_match && (regex_match.length >= 2))
			rotation = parseInt(regex_match[1]);

		img_tag_global.draggable();

		Update();
	};

	var	Buttons_GetDOM = function()
	{
		var	rot_counter_clockwise =
						$("<span>")
							.on("click", RotateLeft)
							.addClass("cursor_pointer fa-lg fa-stack")
							.attr("aria-hidden", "true")
							.attr("data-toggle", "tooltip")
							.attr("data-placement", "top")
							.attr("data-title", "против часовой")
							.tooltip()
							.append("<i class=\"fa fa-inverse fa-circle fa-stack-2x\" aria-hidden=\"true\"> </i><i class=\"rotate_left_onhover cursor_pointer animateClass fa fa-undo fa-stack-1x\" aria-hidden=\"true\"> </i>");
		var	rot_clockwise =
						$("<span>")
							.on("click", RotateRight)
							.addClass("cursor_pointer fa-lg fa-stack")
							.attr("aria-hidden", "true")
							.attr("data-toggle", "tooltip")
							.attr("data-placement", "top")
							.attr("data-title", "по часовой")
							.tooltip()
							.append("<i class=\"fa fa-inverse fa-circle fa-stack-2x\" aria-hidden=\"true\"> </i><i class=\"rotate_right_onhover cursor_pointer fa fa-repeat fa-stack-1x\" aria-hidden=\"true\"> </i>");
		var	flip_vertical =
						$("<span>")
							.on("click", FlipVertical)
							.addClass("cursor_pointer fa-lg fa-stack")
							.attr("aria-hidden", "true")
							.attr("data-toggle", "tooltip")
							.attr("data-placement", "top")
							.attr("data-title", "вертикальное отображение")
							.tooltip()
							.append("<i class=\"fa fa-inverse fa-circle fa-stack-2x\" aria-hidden=\"true\"> </i><i class=\"flip_vertical_onhover cursor_pointer animateClass fa fa-arrows-v fa-stack-1x\" aria-hidden=\"true\"> </i>");
		var	flip_horizontal =
						$("<span>")
							.on("click", FlipHorizontal)
							.addClass("cursor_pointer fa-lg fa-stack")
							.attr("aria-hidden", "true")
							.attr("data-toggle", "tooltip")
							.attr("data-placement", "top")
							.attr("data-title", "горизонтальное отображение")
							.tooltip()
							.append("<i class=\"fa fa-inverse fa-circle fa-stack-2x\" aria-hidden=\"true\"> </i><i class=\"flip_horizontal_onhover cursor_pointer animateClass fa fa-arrows-h fa-stack-1x\" aria-hidden=\"true\"> </i>");
		var	zoom_in =
						$("<span>")
							.on("click", ZoomIN)
							.addClass("cursor_pointer fa-lg fa-stack")
							.attr("aria-hidden", "true")
							.attr("data-toggle", "tooltip")
							.attr("data-placement", "top")
							.attr("data-title", "увеличить")
							.tooltip()
							.append("<i class=\"fa fa-inverse fa-circle fa-stack-2x\" aria-hidden=\"true\"> </i><i class=\"zoomin_onhover cursor_pointer animateClass fa fa-plus fa-stack-1x\" aria-hidden=\"true\"> </i>");
		var	zoom_out =
						$("<span>")
							.on("click", ZoomOUT)
							.addClass("cursor_pointer fa-lg fa-stack")
							.attr("aria-hidden", "true")
							.attr("data-toggle", "tooltip")
							.attr("data-placement", "top")
							.attr("data-title", "уменьшить")
							.tooltip()
							.append("<i class=\"fa fa-inverse fa-circle fa-stack-2x\" aria-hidden=\"true\"> </i><i class=\"zoomout_onhover cursor_pointer animateClass fa fa-minus fa-stack-1x\" aria-hidden=\"true\"> </i>");


		return $()
					.add(rot_counter_clockwise)
					/*.add($("&nbsp;"))*/
					/*.add($("&nbsp;"))*/
					.add(rot_clockwise)
					/*.add($("&nbsp;"))*/
					/*.add($("&nbsp;"))*/
					.add(flip_vertical)
					/*.add($("&nbsp;"))*/
					/*.add($("&nbsp;"))*/
					.add(flip_horizontal)
					/*.add($("&nbsp;"))*/
					/*.add($("&nbsp;"))*/
					.add(zoom_in)
					/*.add($("&nbsp;"))*/
					/*.add($("&nbsp;"))*/
					.add(zoom_out)
					;
	};

	var	Update = function()
	{
		img_tag_global.css({"transform": "rotateZ(" + rotation + "deg) scaleX(" + scaleX + ") scaleY(" + scaleY + ")"});
	};

	var	RotateLeft = function()
	{
		var		id = img_tag_global.closest("div.row").attr("id").replaceAll(/\D/, "");

		rotation = rotation - 90;
		Update();

		$.getJSON("/cgi-bin/anyrole_1.cgi?action=AJAX_rotateImageCounterclockwise", {id: id})
				.done(function(data) {
					if(data.result == "success")
					{
						// --- good2go

					}
					else
					{
						system_calls.PopoverError(img_tag_global, data.description);
					}
				});

	};

	var	RotateRight = function()
	{
		var		id = img_tag_global.closest("div.row").attr("id").replaceAll(/\D/, "");

		rotation = rotation + 90;
		Update();

		$.getJSON("/cgi-bin/anyrole_1.cgi?action=AJAX_rotateImageClockwise", {id: id})
				.done(function(data) {
					if(data.result == "success")
					{
						// --- good2go

					}
					else
					{
						system_calls.PopoverError(img_tag_global, data.description);
					}
				});
	};

	var	FlipHorizontal = function()
	{
		var		id = img_tag_global.closest("div.row").attr("id").replaceAll(/\D/, "");

		if((rotation % 180) === 0)
			scaleX = -scaleX;
		else
			scaleY = -scaleY;
		Update();

		$.getJSON("/cgi-bin/anyrole_1.cgi?action=AJAX_flipImageHorizontal", {id: id})
				.done(function(data) {
					if(data.result == "success")
					{
						// --- good2go

					}
					else
					{
						system_calls.PopoverError(img_tag_global, data.description);
					}
				});
	};

	var	FlipVertical = function()
	{
		var		id = img_tag_global.closest("div.row").attr("id").replaceAll(/\D/, "");

		if((rotation % 180) === 0)
			scaleY = -scaleY;
		else
			scaleX = -scaleX;
		Update();

		$.getJSON("/cgi-bin/anyrole_1.cgi?action=AJAX_flipImageVertical", {id: id})
				.done(function(data) {
					if(data.result == "success")
					{
						// --- good2go

					}
					else
					{
						system_calls.PopoverError(img_tag_global, data.description);
					}
				});
	};

	var	ZoomIN = function()
	{
		scaleX += scaleX * 0.2;
		scaleY += scaleY * 0.2;
		Update();
	};

	var	ZoomOUT = function()
	{
		scaleX -= scaleX * 0.2;
		scaleY -= scaleY * 0.2;
		Update();
	};


	return {
		Init: Init,
		Buttons_GetDOM: Buttons_GetDOM,
	};
};


// carousel attribute: data_ride="carousel" will play carousel once visible
// carousel attribute: data_ride_type="cycle|once" will play carouse indefinitely or just once
var carousel_tools = (function()
{
	var	CAROUSEL_DELAY			= 1000;
	var	active_carousels_global = [];
	var	timeout_handlers_global = [];

	var GetVisibleCarousels = function()
	{
		var		carousels = [];

		$("div.carousel[data_ride='carousel']").each(function(){
			var	curr_tag = $(this);

			if(system_calls.isTagFullyVisibleInWindowByHeight(curr_tag))
			{
				carousels.push(curr_tag.attr("id"));
			}
		});

		return carousels;
	};

	var	PlayVisibleCarousels = function()
	{
		var	visible_carousels = GetVisibleCarousels();
		var	prev_visible_carousels = active_carousels_global;

		var	newly_visible_carousels	= system_calls.ArrayLeftIntersection(visible_carousels, prev_visible_carousels);
		var	invisible_carousels		= system_calls.ArrayRightIntersection(visible_carousels, prev_visible_carousels);

		PlayNewlyVisibleCarousels(newly_visible_carousels);
		StopInvisibleAnymoreCarousels(invisible_carousels);

		// --- store visible carousels only
		active_carousels_global = visible_carousels;
	};

	var	PlayNewlyVisibleCarousels = function(carousels)
	{
		if(carousels.length) console.debug("new carousels:", carousels);

		for (var i = carousels.length - 1; i >= 0; i--) 
		{
			ScheduleNextSlideAfterTimeout(carousels[i]);
		}
	};

	var	StopInvisibleAnymoreCarousels = function(carousels)
	{
		if(carousels.length) console.debug("hidden carousels:", carousels);

		for (var i = carousels.length - 1; i >= 0; i--) 
		{
			clearTimeout(timeout_handlers_global[carousels[i]]);
			delete(timeout_handlers_global[carousels[i]]);
		}
	};

	var	GetTotalNumberOfItems = function(carousel_id)
	{
		return $("#" + carousel_id).find(".item").length;
	};

	var	GetPlayedAttempts = function(carousel_id)
	{
		var played_attempts = $("#" + carousel_id).attr("data_playedattempts") || 0;

		return parseInt(played_attempts);
	};

	var	GetRideType = function(carousel_id)
	{
		var played_attempts = $("#" + carousel_id).attr("data_ride_type") || 0;

		return parseInt(played_attempts);
	};

	var	SetPlayedAttempts = function(carousel_id, attempts)
	{
		$("#" + carousel_id).attr("data_playedattempts", attempts);

		return attempts;
	};

	var	GetActiveItemIndex = function(carousel_id)
	{
		var		number_of_items = GetTotalNumberOfItems(carousel_id);
		var		active_item = 0;

		for (var i = 0; i < number_of_items; ++i) 
		{
			if($("#" + carousel_id).find(".item").eq(i).is(".active"))
			{
				active_item = i;
				break;
			}
		}

		return active_item;
	};

	var	IncreaseCarouselPlayedAttempts = function(carousel_id)
	{
		var		current_counter	= GetPlayedAttempts(carousel_id);

		return SetPlayedAttempts(carousel_id, current_counter + 1);
	};

	var ScheduleNextSlideAfterTimeout = function(carousel_id)
	{
		timeout_handlers_global[carousel_id] = setTimeout(Player, CAROUSEL_DELAY, carousel_id);
	};

	var	Player = function(carousel_id)
	{
		var		number_of_items	= GetTotalNumberOfItems(carousel_id);
		var		active_idx		= GetActiveItemIndex(carousel_id);
		var		next_idx		= (active_idx + 1) % number_of_items;
		var		ride_type	 	= GetRideType(carousel_id) || "once";

		console.debug("slide ", carousel_id, ", ", active_idx, " -> ", next_idx);

		if(ride_type == "once")
		{
			// --- play once
			if(GetPlayedAttempts(carousel_id) == 0)
			{
				if(active_idx < (number_of_items - 1))
				{
					$("#" + carousel_id).carousel(next_idx);
				}
				else
				{
					IncreaseCarouselPlayedAttempts(carousel_id);
				}
			}
		}
		else if(ride_type == "cycle")
		{
			// --- play in cycle
			$("#" + carousel_id).carousel(next_idx);
		}
		else
		{
			console.error("Carousel ride type(" + ride_type + ") is unknown");
		}

		ScheduleNextSlideAfterTimeout(carousel_id);
	};

	return {
		PlayVisibleCarousels: PlayVisibleCarousels,
	};
})();
