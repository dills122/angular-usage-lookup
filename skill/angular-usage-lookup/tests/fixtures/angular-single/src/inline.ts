import { Component } from '@angular/core';
import { SuperCoolComponent } from './super-cool';

@Component({
  imports: [SuperCoolComponent],
  template: '😀 <super-cool /> <super-cool></super-cool>',
})
export class InlineHost {}
