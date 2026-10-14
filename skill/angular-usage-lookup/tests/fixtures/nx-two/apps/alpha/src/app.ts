import { Component } from '@angular/core';
import { SuperCoolComponent as Cool } from '@lookup/ui';

@Component({
  imports: [Cool],
  template: '@if (true) { <super-cool /> } @defer { <super-cool /> }',
})
export class AlphaApp {}
