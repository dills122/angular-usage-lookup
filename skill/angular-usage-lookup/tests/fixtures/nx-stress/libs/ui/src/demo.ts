import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiModule } from './ui.module';
@Component({ imports: [CommonModule, UiModule], template: '<super-cool *ngIf="visible" label="demo" />' })
export class UiDemo { visible = true; }
