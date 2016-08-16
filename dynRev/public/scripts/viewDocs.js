var statusBox = document.getElementById("statusBox");

var addItemButton = document.getElementById("addItem");
var addDiv = addItemButton.parentNode;

addItemButton.addEventListener('click', function(){

	var req = new XMLHttpRequest();

	var data = {};
	data['favorite'] = document.getElementById("addItemCheck").checked;
	var colors = document.getElementsByName("color");
	for(var i = 0; i < colors.length; i++){
		if(colors[i].checked){
			data['color'] = colors[i].value;
		}
	}
	data['name'] = document.getElementById("addItemText1").value;
	data['type'] = document.getElementById("addItemText2").value;
	data['uri'] = document.getElementById("addItemText3").value;

	console.log(data);

	req.open("POST", "/addItem", true);
	req.setRequestHeader('Content-type', "application/json");
	req.addEventListener('load', function(){
		console.log(req.responseText);
		window.location = '/';
	});
	req.send(JSON.stringify(data));
});


var editButtons = document.getElementsByClassName("editButtons");
var saveButton = {};

for(var i = 0; i < editButtons.length; i++){
	editButtons[i].addEventListener('click', function(){
		var index = i;
		var row = editButtons[index].parentNode.parentNode;
		return function(){
			var tempOld = row.children[0];
			//Favorite Checkbox
			var tempNew = document.createElement('input');
			tempNew.type = "checkbox";
			tempNew.name = "favorite";
			if(tempOld.textContent == "*"){
				tempOld.textContent = "";
				tempNew.checked = true;
			} else {
				tempNew.checked = false;
			}
			tempOld.appendChild(tempNew);
			//Name Text
			tempOld = row.children[1];
			tempNew = document.createElement('input');
			tempNew.type = "text";
			tempNew.value = tempOld.textContent;
			tempNew.name = "name";
			tempNew.className = "name";
			tempOld.textContent = "";
			tempOld.appendChild(tempNew);
			//Type Select
			tempOld = row.children[2];
			tempNew.name = "type";
			tempNew = document.createElement('select');
			var option = document.createElement('option');
			option.value = "Image";
			option.textContent = "Image";
			tempNew.appendChild(option);
			option = document.createElement('option');
			option.value = "Video";
			option.textContent = "Video";
			tempNew.appendChild(option);
			option = document.createElement('option');
			option.value = "Gif";
			option.textContent = "Gif";
			tempNew.appendChild(option);
			option = document.createElement('option');
			option.value = "Link";
			option.textContent = "Link";
			tempNew.appendChild(option);
			option = document.createElement('option');
			option.value = "Other";
			option.textContent = "Other";
			tempNew.appendChild(option);
			tempNew.value = tempOld.textContent;
			tempOld.textContent = "";
			tempOld.appendChild(tempNew);
			//URI url
			tempOld = row.children[3];
			tempNew = document.createElement('input');
			tempNew.type = "url";
			tempNew.value = tempOld.textContent;
			tempNew.name = "uri";
			tempNew.className = "uri";
			tempOld.textContent = "";
			tempOld.appendChild(tempNew);
			//Store Old Save Button
			tempOld = row.children[row.children.length-1];
			saveButton[row.id] = tempOld.children[0];
			tempOld.removeChild(tempOld.children[0]);
			//Add New Color Select
			var tempTD = document.createElement('td');
			tempNew = document.createElement('select');
			tempNew.className = "color";
			option = document.createElement('option');
			option.value = "lightcoral";
			option.textContent = "red";
			tempNew.appendChild(option);
			option = document.createElement('option');
			option.value = "lightskyblue";
			option.textContent = "blue";
			tempNew.appendChild(option);
			option = document.createElement('option');
			option.value = "lightgoldenrodyellow";
			option.textContent = "yellow";
			tempNew.appendChild(option);
			option = document.createElement('option');
			option.value = "none";
			option.textContent = "none";
			tempNew.appendChild(option);
			tempTD.appendChild(tempNew);
			row.insertBefore(tempTD, row.children[row.children.length-1]);
			if(row.style.backgroundColor){
				tempNew.value = row.style.backgroundColor;
			} else {
				tempNew.value = "none";
			}
			tempNew = document.createElement('input');
			tempNew.type = "button";
			tempNew.value = "Confirm";
			tempNew.addEventListener('click', function(){
				var update = {};
				update['_id'] = row.id;
				update['favorite'] = row.children[0].children[0].checked;
				update['name'] = row.children[1].children[0].value;
				update['type'] = row.children[2].children[0].value;
				update['uri'] = row.children[3].children[0].value;
				update['color'] = row.children[4].children[0].value;
				var edReq = new XMLHttpRequest();
				edReq.open('POST', "/updateItem", true);
				edReq.setRequestHeader('Content-type', 'application/json');
				edReq.addEventListener('load', function(){
					window.location = '/';
				});
				edReq.send(JSON.stringify(update));
					
			});
			tempOld.appendChild(tempNew);

			tempNew = document.createElement('input');
			tempNew.type = "button";
			tempNew.value = "Delete";
			tempNew.addEventListener('click', function(){
				var del = {};
				del['_id'] = row.id;

				var delReq = new XMLHttpRequest();
				delReq.open("POST", "/dynRevDelItem", true);
				delReq.setRequestHeader('Content-type', 'application/json');
				delReq.addEventListener('load', function(){
					window.location = '/';
				});
				delReq.send(JSON.stringify(del));
			});
			tempOld.appendChild(tempNew);

			tempNew = document.createElement('input');
			tempNew.type = "button";
			tempNew.value = "Cancel";
			tempNew.addEventListener('click', convertDataRowStatic(row));
			tempOld.appendChild(tempNew);

				
		};
	}());
}

var convertDataRowStatic = function(row){
	var dataArray = [];
	var favorite = row.children[0].children[0].checked;
	var name = row.children[1].children[0].value;
	var type = row.children[2].children[0].value;
	var uri = row.children[3].children[0].value;
	var color = row.children[4].children[0].value
	dataArray[0] = favorite;
	dataArray[1] = name;
	dataArray[2] = type;
	dataArray[3] = uri;
	return function(){
		var tempOld = row.children[0];
		tempOld.removeChild(tempOld.children[0]);
		if(favorite){
			tempOld.textContent = "*";
		} else {
			tempOld.textContent = "";
		}
		for(var i = 1; i < row.children.length-1; i++){
			tempOld = row.children[i];
			tempOld.removeChild(tempOld.children[0]);
			if(i == row.children.length-3){
				var tempLink = document.createElement('a');
				tempLink.href = dataArray[i];
				tempLink.textContent = dataArray[i];
				tempOld.appendChild(tempLink);
			} else {
				tempOld.textContent = dataArray[i];
			}
		}
		row.removeChild(row.children[4]);
		tempOld = row.children[row.children.length-1];
		tempOld.removeChild(tempOld.children[0]);
		tempOld.removeChild(tempOld.children[0]);
		tempOld.removeChild(tempOld.children[0]);
		tempOld.appendChild(saveButton[row.id]);
	}
}

