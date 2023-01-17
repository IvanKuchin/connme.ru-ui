export default class Ribbons {
	constructor(user_ribbons) {
		this.user_ribbons = user_ribbons;
		this.user_ribbons.sort(this.compareUserRibbonsDate);
	}

	compareUserRibbonsDate(a, b) {
		let a_ts = parseInt(a.received_timestamp);
		let b_ts = parseInt(b.received_timestamp)
		if(a_ts < b_ts) { return -1; }
		if(a_ts > b_ts) { return 1; }
		return 0;
	}

	draw() {
		let div_container = document.getElementById("RibbonPath");

		for(const user_ribbon of this.user_ribbons) {
			let scene = document.createElement("section");
			scene.classList.add("scene");
			let ribbon = document.createElement("section");
			ribbon.classList.add(`ribbon`);
			ribbon.setAttribute("user-ribbon-id", user_ribbon.id);
			ribbon.setAttribute("description", user_ribbon.ribbon.title);
			ribbon.setAttribute("receive-date", user_ribbon.received_timestamp);

			let sec_front = document.createElement("section");
			sec_front.classList.add("front");
			let sec_back = document.createElement("section");
			sec_back.classList.add("back");

			let img = document.createElement("img");
			img.setAttribute("src", `${user_ribbon.ribbon.image}`);

			let d1 = new Date(parseInt(user_ribbon.received_timestamp) * 1000);
			let date = document.createElement("date");
			date.append(d1.toLocaleDateString());

			let p = document.createElement("p");
			p.classList.add("description");
			p.append(user_ribbon.ribbon.title);

			div_container.appendChild(scene);
			scene.appendChild(ribbon);
			ribbon.appendChild(sec_front);
			ribbon.appendChild(sec_back);
			sec_front.appendChild(img);
			sec_back.appendChild(date);
			sec_back.appendChild(p);
		}
	}
}