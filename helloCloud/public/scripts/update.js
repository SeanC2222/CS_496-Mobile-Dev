var upBut = document.getElementById("update");

upBut.addEventListener('click', function(){
	var newTime = new XMLHttpRequest();
	newTime.open("GET", "/getTime", true);
	newTime.addEventListener('load', function(){
		if(newTime.status >= 200 && newTime.status < 400){
			var t = document.getElementById("time");
			time.textContent = newTime.responseText;
		} else {
			console.log("ERROR UPDATING: " + newTime.responseText);
		}
	});
	newTime.send();
});
