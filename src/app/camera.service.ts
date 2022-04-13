import { Injectable } from '@angular/core';
import { SocketService } from './socket.service';
import { Observable, Subject } from 'rxjs/Rx';

@Injectable({
  providedIn: 'root'
})
export class CameraService {

  messages: Subject<any>;

  constructor(private sService: SocketService) {
    this.messages = <Subject<any>>sService
      .connect()
      .map((response: any): any => {
        return response;
      })
  }

  send(msg){
    this.messages.next({part1:msg, part2:{}});
  }

  sendData(msg, data){
    this.messages.next({part1:msg, part2:data});
  }

  direction(msg){
    this.messages.next({part1:'change_state', part2:{'direction':msg}});
  }
}
