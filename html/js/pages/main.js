var		main_page = main_page || {};

main_page = (function() 
{
	"use strict";
	var loadingModalState = "hidden";
	var	typingAlarmFlagActive = false;

	var Init = function()
	{
		$(".read-more-span").hide();
		$(".read-more-href").on("click", function(evt)
			{
				$(this).hide();
				$(this).next().slideToggle();
				// $(this).next().slideDown();
				// evt.preventDefault();
				return false;		
			});
	};

	return {
		Init: Init
	};

})();

