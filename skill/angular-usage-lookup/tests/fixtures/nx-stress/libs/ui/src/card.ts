import { Component, Input } from '@angular/core';
@Component({ selector: 'super-cool', standalone: false, template: '<strong>{{label}}</strong><ng-content />' })
export class SuperCoolComponent { @Input() label = ''; }
