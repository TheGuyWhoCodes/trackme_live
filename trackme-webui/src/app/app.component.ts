import { Component } from '@angular/core';
import { create as nipplejsCreate } from 'nipplejs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'trackme-webui';

  ngOnInit() {
      let options = {
          zone: document.getElementById('zone_joystick'),
          color: "red",
          mode: "static" as "dynamic" | "semi" | "static",
          position: {left: "50%", bottom: "50%" }
      }
      let manager = nipplejsCreate(options);
  }
}
