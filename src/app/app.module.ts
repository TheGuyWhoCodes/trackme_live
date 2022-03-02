import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SocketIoModule, SocketIoConfig } from 'ngx-socket-io';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { HeaderComponent } from './header/header.component';
import { NgxSliderModule } from '@angular-slider/ngx-slider';
import { NgxJoystickModule } from 'ngx-joystick'; 

const socketConfig = {
	url: 'http://localhost:4001', // Where the Socket IO instance is for Flask

};

@NgModule({
  declarations: [
	HeaderComponent,
    AppComponent
  ],
  imports: [
    BrowserModule,
	AppRoutingModule,
	SocketIoModule.forRoot(socketConfig),
    NgxSliderModule,
    NgxJoystickModule,
	NgbModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
