
var	companies_i_own_list = companies_i_own_list || {};

var	companies_i_own_list = (function()
{
	"use strict";

	var	JSON_FindCompaniesList_Autocomplete = [];
	var JSON_MyCompaniesList;
	var	current_action = "";

	var	Init = function()
	{
		current_action = $("#companies_i_own_list").data("action");
		if(!current_action.length) current_action = "companies_i_own_list";

		GetCompaniesList();


		$("#companySearchText").on("input", FindCompaniesOnInputHandler)
								.on("keyup", FindCompaniesOnKeyupHandler);
		$("#companySearchButton").on("click", FindCompaniesFormSubmitHandler);

		$("#mailCompanyPossessionRequest").on("click", CraftPossessionMail);
		$("#PossessionAlertModal_Submit").on("click", SendPossessionAlert);
		$("#PossessionRequestModal_Submit").on("click", SendPossessionRequest);
		$("#PossessionRequestModal").on("hidden.bs.modal", function() { setTimeout(SendPossessionRequestResult, 100); });
	};

	var CraftPossessionMail = function()
	{
		var		currTag = $(this);
		var		mailDomain;
		var		link;

		{
			var		tempArr = document.location.host.split(".");

			mailDomain = tempArr.slice(tempArr.length - 2).join(".");
		}

		link	= "mailto:admin@" + mailDomain + "?subject=Смена владельца компании"
				+ "&body=Добрый день ! " + encodeURIComponent("\n\n")
				+ "Прошу передать владение компанией " + $("#PossessionRequestModal_Submit").data("name") + "(id: " + $("#PossessionRequestModal_Submit").data("id") + ") мне " + $("#myFirstName").text() + " " + $("#myLastName").text() + " (id: " + $("#myUserID").data("myuserid") + "). " + encodeURIComponent("\n")
				+ "Свидетельство собственности и копия паспорта приложены к письму." + encodeURIComponent("\n\n")
				+ "С уважением " + $("#myFirstName").text() + " " + $("#myLastName").text() + ".";


		window.location.href = link;
	};

	var	SendPossessionRequestResult = function()
	{
		// --- data properties setup in SendPossessionRequest function
		if(typeof($("#PossessionRequestModal_Submit").data("result")) == "string")
		{
			if($("#PossessionRequestModal_Submit").data("result") == "success")
			{
				$("#ResultModal .modal-title").empty().append("Ваш запрос отправлен");
				$("#ResultModal .description").empty().append("Администрация сайта <ul><li>НЕ влияет на принятие решения</li><li>НЕ влияет на сроки принятия решения</li><li>НЕ несет ответственности за решение приянтое владельцем компании</li></ul>");
			}
			else
			{
				$("#ResultModal .modal-title").empty().append("<i class=\"fa fa-exclamation-triangle color_red\" aria-hidden=\"true\"></i> Ошибка");
				$("#ResultModal .description").empty().append($("#PossessionRequestModal_Submit").data("description"));
			}
			$("#ResultModal").modal("show");
		}

		$("#PossessionRequestModal_Submit").removeData();
	};

	var	SendPossessionAlert = function()
	{
		var		currTag = $(this);

		currTag.button("loading");

		$.getJSON(
			"/cgi-bin/company.cgi",
			{ action:"AJAX_companyTakeOwnership", id:currTag.data("id") })
			.done(function(data) {
					if(data.result == "success")
					{
						// $("#companies_i_own_list").empty();
						// RenderCompaniesList(data.companies);
						window.location.href = "/edit_company?companyid=" + currTag.data("id") + "&rand=" + system_calls.GetUUID();
					}
					else
					{
						console.debug("AJAX_companyTakeOwnership.done(): ERROR: " + data.description);
					}

					setTimeout(function() {currTag.button("reset"); }, 500); // --- wait for animation
				})
			.fail(function()
				{
					console.debug("AJAX_companyTakeOwnership.done(): ERROR: parsing JSON response form server");

					setTimeout(function() {currTag.button("reset"); }, 500); // --- wait for animation
				}); // --- getJSON.done()
	};

	var	SendPossessionRequest = function()
	{
		var		currTag = $(this);

		currTag.button("loading");

		$.getJSON(
			"/cgi-bin/company.cgi",
			{ action:"AJAX_companyPossessionRequest", id:currTag.data("id"), description:$("#PossessionRequestModal textarea").val() })
			.done(function(data) {
					currTag	.data("result", data.result)
							.data("description", (typeof(data.description) != "undefined" ? data.description : ""));
					$("#PossessionRequestModal").modal("hide");

					if(data.result == "success")
					{
						$("#PossessionRequestModal textarea").val("");
					}
					else
					{
						console.debug("AJAX_companyTakeOwnership.done(): ERROR: " + data.description);
					}

					currTag.button("reset");
				})
			.fail(function()
				{
					
					console.debug("AJAX_companyTakeOwnership.done(): ERROR: parsing JSON response form server");

					currTag	.data("result", "error")
							.data("description", "ОШИБКА ответа сервера");
					$("#PossessionRequestModal").modal("hide");

					currTag.button("reset");
				}); // --- getJSON.done()
	};

	// --- company button callback function 
	var	CompanyManagementButtonClickHandler = function(e)
	{
		var		currTag = $(this);
		var		currAction = currTag.data("action");

		if(currAction == "companyProfileEdit")
		{
			window.location.href = "/edit_company?companyid=" + currTag.data("id") + "&rand=" + system_calls.GetUUID();
		}
		else if(currAction == "companyProfileTakeOwnership")
		{
			$("#PossessionAlertModal_Submit")	.data("id", currTag.data("id"))
												.data("name", currTag.data("name"));
		}
		else if(currAction == "companyProfileRequestOwnership")
		{
			$("#PossessionRequestModal_Submit")	.data("id", currTag.data("id"))
												.data("name", currTag.data("name"));
		}
	};


	var	RenderCompaniesList = function(arrayCompaniesList)
	{
		if(arrayCompaniesList.length == 0)
		{
			// reduce counter
			// --globalPageCounter;

			console.debug("BuildMyNetworkList: reduce page# due to request return empty result");
		}
		else
		{
			arrayCompaniesList.forEach(function(item, i, arr)
				{
					$("#companies_i_own_list").append(system_calls.BuildCompanySingleBlock(item, i, arr, CompanyManagementButtonClickHandler));
				});
		}
	};

	var	GetCompaniesList = function () 
	{
		$.getJSON(
			"/cgi-bin/company.cgi",
			{action:"AJAX_getMyCompaniesList"})
			.done(function(data) {
						if(data.status == "success")
						{
							JSON_MyCompaniesList = [];
							data.companies.forEach(function(item, i, arr)
								{
									// JSON_MyCompaniesList.push({id:item.id, login:item.login, name:item.name, nameLast:item.nameLast, currentEmployment:item.currentEmployment, currentCity:item.currentCity, avatar: item.avatar});
									JSON_MyCompaniesList.push(item);
								});

							$("#companies_i_own_list").empty();
							RenderCompaniesList(JSON_MyCompaniesList);
						}
						else
						{
							console.debug("AJAX_getMyCompaniesList.done(): ERROR: " + data.description);
						}
				}); // --- getJSON.done()
	};

	var	AJAX_getFindCompanyByID = function (event, ui) 
	{
		var	selectedID = ui.item.id;
		var selectedLabel = ui.item.label;

		console.debug("AJAX_getFindCompanyByID autocomplete.select: select event handler");
		console.debug("AJAX_getFindCompanyByID autocomplete.select: selectedID=" + selectedID + " selectedLabel=" + selectedLabel);

		$.getJSON(
			"/cgi-bin/company.cgi",
			{action:"AJAX_getFindCompanyByID", lookForKey:selectedID})
			.done(function(data) {
						if(data.status == "success")
						{
							JSON_MyCompaniesList = [];
							data.companies.forEach(function(item, i, arr)
								{
									// JSON_MyCompaniesList.push({id:item.id, login:item.login, name:item.name, nameLast:item.nameLast, currentEmployment:item.currentEmployment, currentCity:item.currentCity, avatar: item.avatar});
									JSON_MyCompaniesList.push(item);
								});

							$("#companies_i_own_list").empty();
							RenderCompaniesList(JSON_MyCompaniesList);
						}
						else
						{
							console.debug("AJAX_getFindCompanyByID.done(): ERROR: " + data.description);
						}
				}); // --- getJSON.done()

		console.debug("AJAX_getFindCompanyByID autocomplete.select: end");
	};

	var FindCompaniesOnInputHandler = function() 
	{
		var		inputValue = $(this).val();
		console.debug("FindCompaniesOnInputHandler: start. input.val() " + $(this).val());

		if(inputValue.length == 3)
		{
			$.getJSON(
				"/cgi-bin/company.cgi",
				{action:"AJAX_getFindCompaniesListAutocomplete", lookForKey:inputValue})
				.done(function(data) {
						if(data.status == "success")
						{

							JSON_FindCompaniesList_Autocomplete = [];
							data.companies.forEach(function(item, i, arr)
								{
									var	autocompleteLabel;
									var	obj;

									autocompleteLabel = "";

									if((item.name.length > 0))
									{
										if(autocompleteLabel.length > 0) { autocompleteLabel += " "; }
										autocompleteLabel += item.name;
									}

									obj = {id:item.id , label:autocompleteLabel};

									JSON_FindCompaniesList_Autocomplete.push(obj);
								});

							console.debug("AJAX_getFindCompaniesListAutocomplete.done(): converted to autocomplete format. Number of elements in array " + JSON_FindCompaniesList_Autocomplete.length);

							$("#companySearchText").autocomplete({
								delay : 300,
								source: JSON_FindCompaniesList_Autocomplete,
								select: AJAX_getFindCompanyByID,
								change: function (event, ui) { 
									console.debug ("FindCompaniesOnInputHandler autocomplete.change: change event handler"); 
								},
								close: function (event, ui) 
								{ 
									console.debug ("FindCompaniesOnInputHandler autocomplete.close: close event handler"); 
								},
								create: function () {
									console.debug ("FindCompaniesOnInputHandler autocomplete.create: _create event handler"); 
								},
								_renderMenu: function (ul, items)  // --- requires plugin only
								{
									var	that = this;
									currentCategory = "";
									$.each( items, function( index, item ) {
										var li;
										if ( item.category != currentCategory ) {
											ul.append( "<li class='ui-autocomplete-category'>" + item.category + "</li>" );
											currentCategory = item.category;
										}
										li = that._renderItemData( ul, item );
										if ( item.category ) {
											li.attr( "aria-label", item.category + " : " + item.label + item.login );
										} // --- getJSON.done() autocomplete.renderMenu foreach() if(item.category)
									}); // --- getJSON.done() autocomplete.renderMenu foreach()
								} // --- getJSON.done() autocomplete.renderMenu
							}); // --- getJSON.done() autocomplete
						}
						else
						{
							console.debug("AJAX_getFindCompaniesListAutocomplete.done(): ERROR: " + data.description);
						}
					}); // --- getJSON.done()

		}
		else if(inputValue.length < 3)
		{
			JSON_FindCompaniesList_Autocomplete = [];
			$("#companySearchText").autocomplete({
							delay : 300,
							source: JSON_FindCompaniesList_Autocomplete
						});
		} // --- if(inputValue.length >= 2)
	};


	var FindCompaniesFormSubmitHandler = function()
	{
		var		inputValue = $("#companySearchText").val();
		console.debug("FindCompaniesFormSubmitHandler: start. input.val() [" + inputValue + "]");

		if(inputValue.length >= 3)
		{
			$.getJSON(
				"/cgi-bin/company.cgi",
				{action:"AJAX_getFindCompaniesList", lookForKey:inputValue})
				.done(function(data) {
						if(data.status == "success")
						{
							$("#companies_i_own_list").empty();
							RenderCompaniesList(data.companies);
						}
						else
						{
							console.debug("AJAX_getFindCompaniesList.done(): ERROR: " + data.description);
						}
					}); // --- getJSON.done()

		}
		else
		{
			console.debug("FindCompaniesFormSubmitHandler: ALARM: search string must be more the 2 symbols [" + inputValue + "]");
			// --- tooltip alert
			$("#companySearchText").attr("title", "Напишите более 2 букв")
									.attr("data-placement", "top")
									.tooltip("show");
			window.setTimeout(function()
				{
					$("#companySearchText").tooltip("destroy");
				} 
				, 3000);
									// .tooltip('hide');
			// $("#SearchStringError").modal("show");
		}
	};

	var FindCompaniesOnKeyupHandler = function(event)
	{
		/* Act on the event */
		var	keyPressed = event.keyCode;

		console.debug("FindCompaniesOnKeyupHandler: start. Pressed key [" + keyPressed + "]");

		if(keyPressed == 13) {
			/*Enter pressed*/
			$("#companySearchText").autocomplete("close");
			FindCompaniesFormSubmitHandler();
		}

	};


	return {
		Init: Init,
		CompanyManagementButtonClickHandler: CompanyManagementButtonClickHandler
	};

})();
