import { Component } from '@angular/core';

@Component({ selector: 'super-cool', template: 'Unrelated' })
export class SuperCoolComponent {}

@Component({ imports: [SuperCoolComponent], template: '<super-cool />' })
export class UnrelatedHost {}
