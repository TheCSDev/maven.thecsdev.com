//execute once the document loads
$(document).ready(() =>
{
	//assign on-click listeners to entries
	$("body div.entry").has("span[path]").on("click", function()
	{
		var link = $(this).find("span[path]").text();
		if(link) window.open(link, "_self");
	});

	//home-page-specific handling
	if(window.location.pathname.length === 1)
	{
		//hide the "parent directory" entry
		$("body div.entry[parent-entry]").attr("hidden", "");

		//and show the tutorial div
		$("#tutorial").removeAttr("hidden");
	}
});