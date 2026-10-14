import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '@stress/shared';
import { LegacyPage } from './page';
@NgModule({ declarations: [LegacyPage], imports: [CommonModule, SharedModule], exports: [LegacyPage] })
export class LegacyFeatureModule {}
