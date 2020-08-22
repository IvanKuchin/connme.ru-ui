
var	my_network = my_network || {};

var	my_network = (function()
{

	var JSON_MyNetworkList_Autocomplete;
	var JSON_MyNetworkList;
	var	current_action = "";

	var	Init = function()
	{
		current_action = $("#my_network").data("action") || "my_network";

		GetFriendList();
	};

	var	BuildFoundFriendList = function(arrayFriendList)
	{
		var		tempTag = $();

		if(arrayFriendList.length == 0)
		{
			// reduce counter
			// --globalPageCounter;

			console.debug("BuildMyNetworkList: reduce page# due to request return empty result");
		}
		else
		{

			arrayFriendList.forEach(function(item, i, arr) {
				tempTag = tempTag.add(system_calls.GlobalBuildFoundFriendSingleBlock(item, i, arr))
			});
		}

		return tempTag;
	}

	var	GetFriendList = function () 
	{
		var		JSON_action;

		if(current_action == "my_network") JSON_action = "JSON_getMyNetworkFriendList"
		if(current_action == "who_watched_on_me") JSON_action = "JSON_getWhoWatchedONMeList"

		$.getJSON('/cgi-bin/index.cgi', {action:JSON_action})
			.done(function(data) {
					JSON_MyNetworkList = data;

					$("#my_network").empty().append(BuildFoundFriendList(JSON_MyNetworkList));
				})
			.fail(function() {
				console.debug("GetFriendList:ERROR: parsing JSON response from server");
			})
	}

	return {
		Init: Init
	}

})();
