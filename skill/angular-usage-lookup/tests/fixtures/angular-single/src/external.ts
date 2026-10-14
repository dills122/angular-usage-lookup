import { Component } from '@angular/core';
import { SuperCoolComponent as Cool } from './super-cool';

@Component({ imports: [Cool], templateUrl: './different-name.html' })
export class ExternalHost {}
