import { Component, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiModule } from '@stress/ui';
@Component({ selector: 'shared-panel', standalone: false, template: '<div [ngSwitch]="mode"><super-cool *ngSwitchCase="1" /><super-cool *ngSwitchDefault /></div>' })
export class SharedPanel { mode = 1; }
@Component({ selector: 'shared-badge', imports: [UiModule], template: '<super-cool label="badge" />' })
export class StandaloneBadge {}
@NgModule({ declarations: [SharedPanel], imports: [CommonModule, UiModule, StandaloneBadge], exports: [UiModule, SharedPanel, StandaloneBadge] })
export class SharedModule {}
