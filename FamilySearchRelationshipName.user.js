// ==UserScript==
// @author Jamie22
// @name FamilySearch Relationship Name
// @version 0.1
// @description Script for FamilySearch.org that describes the relationship between you and another person on your family tree when you click "View My Relationship", ie. Grandmother, 3 Times Great Grandfather, 4th Cousin Twice Removed, etc.
// @match https://www.familysearch.org/tree/*
// @copyright 2017 James Shorrock
// @require http://code.jquery.com/jquery-latest.js
// @require  https://gist.github.com/raw/2625891/waitForKeyElements.js
// @grant GM_addStyle
// @license GPL3; https://www.gnu.org/licenses/gpl-3.0.en.html
// ==/UserScript==

// This will be used to display the relationship name on the page
var rlNameSpan = null;

waitForKeyElements("#show", addShowListener);

function addShowListener()
{
    document.getElementById("show").addEventListener("click", getFamilyJSON);
}

function getFamilyJSON()
{
    var ancestorId = window.location.pathname.split('/')[3];

    $.getJSON('https://www.familysearch.org/tree-data/my-relatives/tree-graph-relation/' + window.eval('loggedInPersonId') + '/' + ancestorId, nameRelationship);
}

function grand(rel, numgen)
{
    if (numgen >= 2)
        rel = "Grand" + rel;

    if (numgen >= 3)
        rel = "Great " + rel;

    if (numgen == 4)
        rel = "Great " + rel;

    if (numgen >= 5)
        rel = (numgen - 2) + ' Times ' + rel;

    return rel;
}

function ordinalSuffixOf(i)
{
    var j = i % 10,
        k = i % 100;

    if (j == 1 && k != 11)
        return i + "st";

    if (j == 2 && k != 12)
        return i + "nd";

    if (j == 3 && k != 13)
        return i + "rd";

    return i + "th";
}

function nameRelationship(relChart)
{
	var isDiffBranch = false;
	var isInLaw = false;
	// 1 for up, -1 for down
	var direction = 0;
	var numGenerationsUp = 0;
	var numGenerationsDown = 0;
	var persons = relChart.data.persons;
	var ancestorGender = persons[persons.length-1].gender;

    // Travese the people in the relationship chart
	for(var i = 0; i < persons.length; i++)
	{
		if (!persons[i].relationshipToPrevious)
			continue;

		if (persons[i].relationshipToPrevious == "FATHER" || persons[i].relationshipToPrevious == "MOTHER")
		{
			direction = 1;
			numGenerationsUp++;
		}

		if (persons[i].relationshipToPrevious == "SON" || persons[i].relationshipToPrevious == "DAUGHTER")
		{
			if (direction == 1)
				isDiffBranch = true;

			direction = -1;
			numGenerationsDown++;
		}

		if (persons[i].relationshipToPrevious == "MAN" || persons[i].relationshipToPrevious == "WOMAN")
			isInLaw = true;
	}

	var relationship = '';
	var numGenerations = 0;

	// Direct ancestor or descendant
	if (!isDiffBranch)
	{
		if (direction == 1)
		{
			if (ancestorGender == "FEMALE")
				relationship = "mother";
			else
				relationship = "father";

			numGenerations = numGenerationsUp;
		}
		else
		{
			if (ancestorGender == "FEMALE")
				relationship = "daughter";
			else
				relationship = "son";

			numGenerations = numGenerationsDown;
		}

		relationship = grand(relationship, numGenerations);
	}
	else
	{
		// Sibling
		if (numGenerationsUp == 1 && numGenerationsDown == 1)
		{
			if (ancestorGender == "FEMALE")
				relationship = "Sister";
			else
				relationship = "Brother";
		}

		// Niece or nephew
		if (numGenerationsUp == 1 && numGenerationsDown >= 2)
		{
			if (ancestorGender == "FEMALE")
				relationship = "niece";
			else
				relationship = "nephew";

			relationship = grand(relationship, numGenerationsDown-1);
		}

		// Uncle or aunt
		if (numGenerationsUp >= 2 && numGenerationsDown == 1)
		{
			if (ancestorGender == "FEMALE")
				relationship = "aunt";
			else
				relationship = "uncle";

			relationship = grand(relationship, numGenerationsUp-1);
		}

		// Cousin
		if (numGenerationsUp >= 2 && numGenerationsDown >= 2)
		{
			var cousinNum = Math.min(numGenerationsUp, numGenerationsDown)-1;
			var removedNum = Math.abs(numGenerationsUp - numGenerationsDown);

			relationship = ordinalSuffixOf(cousinNum) + ' Cousin';

			if (removedNum == 1)
				relationship += ' Once Removed';

			if (removedNum == 2)
				relationship += ' Twice Removed';

			if (removedNum >= 3)
				relationship += ' ' + removedNum + ' Times Removed';
		}

		if (isInLaw)
			relationship += ' In-Law';
	}

    // Capitalize first letter
    relationship = relationship.charAt(0).toUpperCase() + relationship.slice(1);

    // Display the relationship name at the bottom of the relationship chart popup
    if(rlNameSpan === null)
    {
        // Works in Firefox
        var infoIcon = document.getElementById("info-icon");

        if(infoIcon === null)
            // Works in Chrome
            infoIcon = document.getElementsByTagName("birch-relationship-calc")[0].shadowRoot.querySelector("#info-icon");

        rlNameSpan = document.createElement('span');
        rlNameSpan.style.fontSize = "18px";
        rlNameSpan.style.paddingLeft = "100px";
        infoIcon.parentNode.insertBefore(rlNameSpan, infoIcon.nextSibling);
    }

    rlNameSpan.innerHTML = relationship;
}
