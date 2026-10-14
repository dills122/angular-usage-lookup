import { Component, inject, Type } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { SharedModule } from '@stress/shared';
import { CoolDialogComponent as DetailsDialog, OtherDialog } from '@stress/dialogs';
@Component({ selector: 'report-panel', imports: [CommonModule, SharedModule], template: '<super-cool *ngIf="ready" label="report" />' })
export class ReportPanel {
  ready = true;
  dialog = inject(MatDialog);
  openDetails() { return this.dialog.open(DetailsDialog); }
  openWrapped() { return this.openAny(DetailsDialog); }
  openOther() { return this.openAny(OtherDialog); }
  openAny(component: Type<unknown>) { return this.dialog.open(component); }
}
