import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '@stress/shared';
import { LegacyFeatureModule } from '@stress/legacy';
import { ModernPanel } from '@stress/modern';
import { ReportPanel } from '@stress/reporting';
import { AdminApp } from './app';
@NgModule({ declarations: [AdminApp], imports: [CommonModule, SharedModule, LegacyFeatureModule, ModernPanel, ReportPanel] })
export class AdminModule {}
