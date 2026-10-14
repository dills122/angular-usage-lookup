import { Component, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
@Component({ selector: 'super-cool', template: 'Unrelated card' })
export class SuperCoolComponent {}
@Component({ selector: 'cool-dialog', template: 'Unrelated dialog' })
export class CoolDialogComponent {}
@Component({ imports: [SuperCoolComponent], template: '<super-cool />' })
export class UnrelatedHost { dialog = inject(MatDialog); open() { return this.dialog.open(CoolDialogComponent); } }
export const documentation = '<super-cool /> CoolDialogComponent';
