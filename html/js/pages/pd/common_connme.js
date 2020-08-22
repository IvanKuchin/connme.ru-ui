/*jslint devel: true, indent: 4, maxerr: 50*/ 
/*globals $:false localStorage:false location: false*/
/*globals localStorage:false*/
/*globals location:false*/
/*globals document:false*/
/*globals window:false*/
/*globals Image:false*/
/*globals jQuery:false*/
/*globals Notification:false*/
/*globals setTimeout:false*/
/*globals navigator:false*/
/*globals module:false*/
/*globals define:false*/

PreviewImageControl = function ()
{
	'use strict';

	var		img_tag_global;
	var		rotation;
	var		scaleX, scaleY;

	var	Init = function(curr_tag)
	{
		img_tag_global = curr_tag;

		var regex = /exif_rotate\-(\d+)/;
		var	regex_match = img_tag_global.attr("class").match(regex);

		img_tag_global.css({'left':'0px', 'top':'0px'}); // --- reset drag-n-drop position
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
		img_tag_global.css({'transform': 'rotateZ(' + rotation + 'deg) scaleX(' + scaleX + ') scaleY(' + scaleY + ')'});
	};

	var	RotateLeft = function()
	{
		var		id = img_tag_global.closest("div.row").attr("id").replaceAll(/\D/, "");

		rotation = rotation - 90;
		Update();

		$.getJSON('/cgi-bin/anyrole_1.cgi?action=AJAX_rotateImageCounterclockwise', {id: id})
				.done(function(data) {
					if(data.result == "success")
					{

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

		$.getJSON('/cgi-bin/anyrole_1.cgi?action=AJAX_rotateImageClockwise', {id: id})
				.done(function(data) {
					if(data.result == "success")
					{

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

		$.getJSON('/cgi-bin/anyrole_1.cgi?action=AJAX_flipImageHorizontal', {id: id})
				.done(function(data) {
					if(data.result == "success")
					{

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

		$.getJSON('/cgi-bin/anyrole_1.cgi?action=AJAX_flipImageVertical', {id: id})
				.done(function(data) {
					if(data.result == "success")
					{

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
