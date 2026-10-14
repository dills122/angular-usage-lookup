import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { SharedModule } from '@stress/shared';
@Component({ selector: 'cool-dialog', imports: [MatDialogModule, SharedModule], template: '<h2 mat-dialog-title>Details</h2><mat-dialog-content><super-cool [label]="data.title" /></mat-dialog-content>' })
export class CoolDialogComponent {
  data = inject<{ title: string }>(MAT_DIALOG_DATA);
  ref = inject(MatDialogRef<CoolDialogComponent>);
}
@Component({ template: 'Other dialog' })
export class OtherDialog {}
