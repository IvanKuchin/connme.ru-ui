/* exported main_page */

var main_page = (function() 
{
	"use strict";

	var Init = function()
	{
		$(".read-more-span").hide();
		$(".read-more-href").on("click", function()
			{
				$(this).hide();
				$(this).next().slideToggle();
				// $(this).next().slideDown();
				// e.preventDefault();
				return false;		
			});
	};

	return {
		Init: Init
	};

})();

