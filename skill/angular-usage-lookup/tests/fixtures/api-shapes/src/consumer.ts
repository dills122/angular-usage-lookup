import {Component} from '@angular/core';
import {FancyDirective, WrappedDirective, FormatPipe, ButtonComponent} from './types';
@Component({imports:[FancyDirective, WrappedDirective, FormatPipe, ButtonComponent],template:`
  <button superButton fancy [glow]="1" (glowed)="count=$event">{{'a' | format}}</button>
  <a superButton></a>
  <button cool></button>
  <button cool disabled></button>
  <div wrapped [power]="1" (powered)="count=$event"></div>
`})
export class Consumer { count = 0; }
