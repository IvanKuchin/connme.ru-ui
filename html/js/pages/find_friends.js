/* exported find_friends */

var find_friends = (function() 
{
	var JSON_FindFriendsList;

	var Init = function() 
	{
		if($("#friendSearchText").val().length)
			FindFriendsFormSubmitHandler();
		else
			SendRequestAndRefreshList("JSON_getMyNetworkFriendList", "");

		// --- search field
		$("#friendSearchText")
									.on("keyup", FindFriendsOnKeyupHandler)
									.autocomplete({
													source: "/cgi-bin/anyrole_1.cgi?action=AJAX_getUserAutocompleteList",
													select: JSON_getFindFriendByID,
												});
		$("#friendSearchButton").on("click", FindFriendsFormSubmitHandler);
	};

	var	BuildFoundFriendList = function(arrayFriendList)
	{
		var		tempTag = $();

		if(arrayFriendList.length == 0)
		{
			// reduce counter
			// --globalPageCounter;

			console.debug("BuildFindFriendList: reduce page# due to request return empty result");
		}
		else
		{
			arrayFriendList.forEach(function(item, i, arr)
			{
				tempTag = tempTag.add(system_calls.GlobalBuildFoundFriendSingleBlock(item, i, arr));
			});
		}

		return tempTag;
	};

	var	SendRequestAndRefreshList = function(action, lookForKey)
	{

		$.getJSON("/cgi-bin/index.cgi", {action:action, lookForKey:lookForKey})
			.done(function(data) 
			{
				JSON_FindFriendsList = data;

				$("#find_friends").empty().append(BuildFoundFriendList(JSON_FindFriendsList));
			})
			.fail(function() {
				console.debug("ERROR: parsing JSON response from server");
			});
	};

	var	JSON_getFindFriendByID = function (event, ui) 
	{
		var	selectedID = ui.item.id;
		// var selectedLabel = ui.item.label;

		SendRequestAndRefreshList("JSON_getFindFriendByID", selectedID);
	};

	var	FindFriendsFormSubmitHandler = function()
	{
		var		inputValue = $("#friendSearchText").val();

		if(inputValue.length >= 3)
			SendRequestAndRefreshList("JSON_getFindFriendsList", inputValue);
		else
		{
			console.debug("FindFriendsFormSubmitHandler: ALARM: search string must be more the 2 symbols [" + inputValue + "]");
			// --- tooltip alert
			system_calls.PopoverError("friendSearchText", "Напишите более 2 букв");
		}
	};

	var	FindFriendsOnKeyupHandler = function(event)
	{
		/* Act on the event */
		var	keyPressed = event.keyCode;

		if(keyPressed == 13) {
			/*Enter pressed*/
			$("#friendSearchText").autocomplete("close");
			FindFriendsFormSubmitHandler();
		}
	};

	return {
		Init: Init
	};
})();

