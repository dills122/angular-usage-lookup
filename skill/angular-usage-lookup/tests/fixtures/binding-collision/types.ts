import {Directive,Input,Component} from '@angular/core';
@Directive({selector:'[target]'}) export class Target { @Input('shared') value = 0; }
@Directive({selector:'[other]'}) export class Other { @Input('shared') value = 0; }
@Component({imports:[Target,Other],template:`<div target other [shared]="1"></div><div other [shared]="2"></div><div target [shared]="3"></div>`}) export class Consumer {}
