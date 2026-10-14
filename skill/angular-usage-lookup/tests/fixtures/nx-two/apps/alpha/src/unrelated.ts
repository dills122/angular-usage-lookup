import { Component } from '@angular/core';

@Component({ selector: 'super-cool', template: 'Different component' })
export class SuperCoolComponent {}

@Component({ imports: [SuperCoolComponent], template: '<super-cool />' })
export class UnrelatedHost {}
