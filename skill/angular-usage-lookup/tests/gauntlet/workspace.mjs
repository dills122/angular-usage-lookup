import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Expectations are authored with fixture source, before any service is queried.
// Markers identify exact TS tokens; data-case labels identify whole start tags.
// Never derive expected usages from a language-service response.
export async function generate(workspace) {
  await rm(workspace, { recursive: true, force: true });
  const files = new Map(), cases = [], expected = [];
  const symbols = { card: 'GauntletCard', legacy: 'LegacyCard', dynamic: 'DynamicCard' };
  const ref = (target, id, token = symbols[target]) => `/*@use:${target}:${id}*/${token}`;
  const tag = (id, attributes = '', target = 'card') => {
    const selector = target === 'card' ? 'gauntlet-card' : 'legacy-card';
    const opening = `<${selector} data-case="${id}"${attributes ? ' ' + attributes : ''}>`;
    cases.push({ id, target, opening, kind: 'template-occurrence' });
    return `${opening}</${selector}>`;
  };
  const put = (file, source) => files.set(file, source.trimStart());
  put('package.json', '{"private":true,"type":"module"}\n');
  put('angular.json', JSON.stringify({ version: 1, projects: { gauntlet: { projectType: 'application', root: '', sourceRoot: 'src' } } }, null, 2));
  put('tsconfig.json', JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler', experimentalDecorators: true,
    strict: true, skipLibCheck: true, noEmit: true }, angularCompilerOptions: { strictTemplates: true }, include: ['src/**/*.ts'] }, null, 2));
  put('src/cards.ts', `
import { Component, NgModule, input, output, model } from '@angular/core';
@Component({ selector: 'gauntlet-card', template: '<ng-content />' })
export class ${ref('card', 'declaration')} {
  label = input('', { alias: 'caption' });
  closed = output<void>({ alias: 'dismissed' });
  count = model(0);
}
@Component({ selector: 'legacy-card', standalone: false, template: '<ng-content />' })
export class ${ref('legacy', 'declaration')} {}
@NgModule({ declarations: [${ref('legacy', 'declarations')}], exports: [${ref('legacy', 'exports')}] })
export class CardModule {}
@Component({ selector: 'dynamic-card', template: '<p>Dynamic content</p>' })
export class ${ref('dynamic', 'declaration')} { caption = input(''); }
`);
  put('src/barrel.ts', `export { ${ref('card', 'barrel')}, CardModule, ${ref('dynamic', 'barrel')} } from './cards';\n`);
  put('src/reexport.ts', `export { ${ref('dynamic', 'renamed-export')} as ${ref('dynamic', 'renamed-export-alias', 'RenamedCard')} } from './barrel';\n`);
  put('src/default-card.ts', `export { ${ref('dynamic', 'default-export')} as ${ref('dynamic', 'default-export-alias', 'default')} } from './cards';\n`);
  put('src/primitives.ts', `
import { Component, Directive, Input, TemplateRef, ViewContainerRef, inject } from '@angular/core';
import { ${ref('card', 'projection-import')} } from './cards';
@Directive({ selector: '[renderWhen]' })
export class RenderWhen {
  private template = inject(TemplateRef<unknown>);
  private container = inject(ViewContainerRef);
  @Input() set renderWhen(value: unknown) {
    this.container.clear();
    if (value) this.container.createEmbeddedView(this.template);
  }
}
@Component({ selector: 'projection-shell', imports: [${ref('card', 'projection-scope')}], template: \`
  <ng-content select="[slot]">${tag('projection-fallback')}</ng-content>
  <ng-content />
\` })
export class ProjectionShell {}
`);
  const legacy = [
    tag('star-if', '*ngIf="show"'),
    '<ng-container *ngIf="show; then thenView; else elseView"></ng-container>',
    `<ng-template #thenView>${tag('if-then')}</ng-template>`,
    `<ng-template #elseView>${tag('if-else')}</ng-template>`,
    `<ng-template [ngIf]="show">${tag('explicit-if')}</ng-template>`,
    tag('star-for', '*ngFor="let item of items; index as i; trackBy: track"'),
    `<ng-template ngFor let-item [ngForOf]="items">${tag('explicit-for')}</ng-template>`,
    `<section [ngSwitch]="choice">${tag('switch-a', '*ngSwitchCase="1"')}${tag('switch-b', '*ngSwitchCase="2"')}${tag('switch-default', '*ngSwitchDefault')}</section>`,
    `<ng-container *ngFor="let item of items"><ng-container *ngIf="show">${tag('nested-legacy')}</ng-container></ng-container>`,
    tag('module-card-if', '*ngIf="show"', 'legacy'),
    `<ng-template #moduleFragment>${tag('module-card-template', '', 'legacy')}</ng-template>`,
    '<ng-container *ngTemplateOutlet="moduleFragment"></ng-container>',
  ];
  put('src/legacy.html', legacy.join('\n') + '\n');
  put('src/legacy.ts', `
import { Component, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ${ref('card', 'legacy-import')}, CardModule } from './barrel';
@Component({ selector: 'legacy-page', standalone: false, templateUrl: './legacy.html' })
export class LegacyPage { show = true; items = [1, 2]; choice: number = 1; track = (i: number) => i; }
@NgModule({ declarations: [LegacyPage], imports: [CommonModule, CardModule, ${ref('card', 'legacy-scope')}, RouterModule.forChild([{ path: '', component: LegacyPage }])], exports: [LegacyPage] })
export class LazyLegacyModule {}
@NgModule({ imports: [LazyLegacyModule, CardModule], exports: [LazyLegacyModule, CardModule] })
export class ReexportModule {}
`);
  const modern = [
    `@if (show) { ${tag('at-if')} } @else if (choice === 2) { ${tag('at-else-if')} } @else { ${tag('at-else')} }`,
    `@if (items; as list) { @for (item of list; track item; let i = $index) { ${tag('at-for')} } @empty { ${tag('at-empty')} } }`,
    `@switch (choice) { @case (1) { ${tag('at-case-one')} } @case (2) { ${tag('at-case-two')} } @default { ${tag('at-default')} } }`,
    `@defer (when show; prefetch on idle) { ${tag('defer-main')} } @placeholder { ${tag('defer-placeholder')} } @loading { ${tag('defer-loading')} } @error { ${tag('defer-error')} }`,
    `@defer (on immediate) { @defer (when show) { ${tag('nested-defer')} } }`,
    `@let local = choice; @if (local > 0) { ${tag('at-let')} }`,
    tag('signal-bindings', '[caption]="label" (dismissed)="onClose()" [(count)]="count"'),
    `<ng-template #fragment let-value let-extra="extra">${tag('template-context', '[caption]="value"')}</ng-template>`,
    '<ng-container *ngTemplateOutlet="fragment; context: {$implicit: label, extra: 1}; injector: customInjector"></ng-container>',
    '<ng-container [ngTemplateOutlet]="fragment" [ngTemplateOutletContext]="{$implicit: label, extra: 2}"></ng-container>',
    `<ng-template #recursive let-nodes><ng-container *ngFor="let node of nodes">${tag('recursive-template')}<ng-container *ngTemplateOutlet="recursive; context: {$implicit: node.children}"></ng-container></ng-container></ng-template>`,
    '<ng-container *ngTemplateOutlet="recursive; context: {$implicit: tree}"></ng-container>',
    `<ng-template>${tag('unused-fragment')}</ng-template>`,
    `<projection-shell>${tag('projected-slot', 'slot ngProjectAs="[slot]"')}${tag('projected-default')}</projection-shell>`,
    tag('custom-structural', '*renderWhen="show"'),
    `<ng-template [renderWhen]="show">${tag('custom-explicit')}</ng-template>`,
    `<ng-template #portalFragment>${tag('template-portal-content')}</ng-template>`,
    '<ng-template [cdkPortalOutlet]="templatePortal"></ng-template>',
    `<ng-template cdkPortal>${tag('cdk-portal-content')}</ng-template>`,
    `<div #domContent>${tag('dom-portal-content')}</div>`,
    `<ng-template #dialogTemplate>${tag('dialog-template-content')}</ng-template>`,
    `<ng-template #embedded>${tag('embedded-view-content')}</ng-template>`,
    '<ng-container #container></ng-container>',
    '<ng-container *ngComponentOutlet="direct; inputs: {caption: label}"></ng-container>',
    '<ng-container [ngComponentOutlet]="selected"></ng-container>',
    '<ng-container [ngComponentOutlet]="legacyType" [ngComponentOutletNgModule]="legacyModule"></ng-container>',
    '<ng-template [cdkPortalOutlet]="componentPortal"></ng-template>',
    tag('standalone-imports-module', '', 'legacy'),
    '<legacy-page />',
    '<router-outlet /><router-outlet name="aux" />',
    '<!-- <gauntlet-card data-case="comment-negative"></gauntlet-card> -->',
    '<pre>&lt;gauntlet-card&gt; {{ html }}</pre>',
    '<div [innerHTML]="html"></div>',
    '<div ngNonBindable><gauntlet-card data-case="non-bindable-negative"></gauntlet-card></div>',
    tag('non-bindable-host', 'ngNonBindable'),
  ];
  // Forty-eight nested views with alternating old/new syntax and repeated outlets.
  let deep = tag('deep-48');
  for (let i = 0; i < 48; i++) deep = i % 2 ? `@if (show) { ${deep} }` : `<ng-container *ngFor="let level${i} of deepItems">${deep}</ng-container>`;
  modern.push(deep);
  put('src/modern.html', modern.join('\r\n') + '\r\n');
  put('src/modern.ts', `
import { Component, EnvironmentInjector, Injector, TemplateRef, ViewChild, ViewContainerRef, ElementRef, ComponentFactoryResolver, createComponent, inject, Type } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { PortalModule, ComponentPortal, TemplatePortal, DomPortal } from '@angular/cdk/portal';
import { MatDialog } from '@angular/material/dialog';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ${ref('card', 'modern-import')}, ${ref('dynamic', 'modern-import')}, CardModule } from './barrel';
import { ${ref('legacy', 'dynamic-module-import')} } from './cards';
import { ReexportModule } from './legacy';
import { RenderWhen, ProjectionShell } from './primitives';
import { OtherCard } from './other';
const REGISTRY = { main: ${ref('dynamic', 'registry')}, other: OtherCard };
@Component({ selector: 'modern-page', imports: [CommonModule, RouterOutlet, PortalModule, ReexportModule, RenderWhen, ProjectionShell, ${ref('card', 'modern-scope')}], templateUrl: './modern.html' })
export class ModernPage {
  show = true; choice: number = 1; items = [1, 2]; deepItems = [1]; label = '🌌'; count = 0;
  tree = [{ children: [] }]; html = '<gauntlet-card>not Angular compiled</gauntlet-card>';
  customInjector = inject(Injector); private env = inject(EnvironmentInjector);
  private view = inject(ViewContainerRef); private resolver = inject(ComponentFactoryResolver);
  private dialog = inject(MatDialog); private sheet = inject(MatBottomSheet); private snack = inject(MatSnackBar);
  direct = ${ref('dynamic', 'outlet-property')}; selected = REGISTRY.main;
  legacyType = ${ref('legacy', 'dynamic-module-property')}; legacyModule = CardModule;
  @ViewChild(${ref('card', 'view-query')}) card?: ${ref('card', 'view-query-type')};
  componentPortal = new ComponentPortal(${ref('dynamic', 'component-portal')});
  templatePortal?: TemplatePortal<unknown>;
  @ViewChild('portalFragment', { read: TemplateRef }) portalFragment!: TemplateRef<unknown>;
  @ViewChild('dialogTemplate', { read: TemplateRef }) dialogTemplate!: TemplateRef<unknown>;
  @ViewChild('embedded', { read: TemplateRef }) embedded!: TemplateRef<unknown>;
  @ViewChild('domContent') domContent!: ElementRef<HTMLElement>;
  onClose() {}
  create() {
    this.view.createComponent(${ref('dynamic', 'view-create')});
    createComponent(${ref('dynamic', 'core-create')}, { environmentInjector: this.env });
    const factory = this.resolver.resolveComponentFactory(${ref('dynamic', 'factory')});
    this.view.createComponent(factory);
    this.view.createEmbeddedView(this.embedded);
    const view = this.embedded.createEmbeddedView({}); this.view.insert(view);
    this.templatePortal = new TemplatePortal(this.portalFragment, this.view);
    const dom = new DomPortal(this.domContent);
    return dom;
  }
  openAll(key: keyof typeof REGISTRY) {
    this.dialog.open(${ref('dynamic', 'dialog-direct')});
    this.sheet.open(${ref('dynamic', 'sheet-direct')});
    this.snack.openFromComponent(${ref('dynamic', 'snack-direct')});
    this.dialog['open'](${ref('dynamic', 'literal-method-dialog')});
    const fake = { open(type: unknown) { return type; } };
    fake.open(${ref('dynamic', 'unrelated-open')});
    this.dialog.open(this.dialogTemplate);
    this.sheet.open(this.dialogTemplate);
    this.snack.openFromTemplate(this.dialogTemplate);
    this.dialog.open(REGISTRY.main);
    this.dialog.open(REGISTRY[key]);
    this.openWrapped(${ref('dynamic', 'wrapper-argument')});
  }
  openWrapped(component: Type<unknown>) { return this.dialog.open(component); }
}
`);
  put('src/other.ts', `
import { Component } from '@angular/core';
@Component({ selector: 'other-card', template: '' }) export class OtherCard {}
@Component({ selector: 'gauntlet-card', template: '' }) export class GauntletCard {}
@Component({ selector: 'unrelated-page', imports: [GauntletCard], template: '<gauntlet-card data-case="wrong-scope"></gauntlet-card>' }) export class UnrelatedPage {}
export class DynamicCard {}
`);
  put('src/inline.ts', `
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ${ref('card', 'inline-import')} } from './barrel';
@Component({ selector: 'inline-page', imports: [CommonModule, ${ref('card', 'inline-scope')}], template: \`
  🌌 @for (item of items; track item) { @if (item > 0) { ${tag('inline-nested')} } }
  ${tag('inline-first')}${tag('inline-second')}
  ${tag('inline-self-closing').replace('></gauntlet-card>', ' />')}
\` })
export class InlinePage { items = [1, 2]; }
`);
  // Reflect the explicitly authored self-closing case in its expected start tag.
  cases.find(c => c.id === 'inline-self-closing').opening = '<gauntlet-card data-case="inline-self-closing" />';
  put('src/routes.ts', `
import { Routes } from '@angular/router';
import { ${ref('dynamic', 'route-import')} } from './barrel';
import { ${ref('dynamic', 'route-renamed-import', 'RenamedCard')} as ${ref('dynamic', 'route-import-alias', 'Alias')} } from './reexport';
import ${ref('dynamic', 'route-default-import', 'DefaultCard')} from './default-card';
import * as Cards from './barrel';
import { ModernPage } from './modern';
import { OtherCard } from './other';
const ROUTE_TYPES = { main: ${ref('dynamic', 'route-registry')}, other: OtherCard };
export const routes: Routes = [
  { path: 'eager', component: ${ref('dynamic', 'route-eager')} },
  { path: 'renamed', component: ${ref('dynamic', 'route-alias', 'Alias')} },
  { path: 'default', component: ${ref('dynamic', 'route-default', 'DefaultCard')} },
  { path: 'namespace', component: Cards.${ref('dynamic', 'route-namespace')} },
  { path: 'lazy-named', loadComponent: () => import('./barrel').then(m => m.${ref('dynamic', 'lazy-named')}) },
  { path: 'lazy-default', loadComponent: () => import('./default-card') },
  { path: 'lazy-destructure', loadComponent: async () => { const { ${ref('dynamic', 'lazy-destructure-binding')}: ${ref('dynamic', 'lazy-destructure-alias', 'LazyCard')} } = await import('./barrel'); return ${ref('dynamic', 'lazy-destructure-return', 'LazyCard')}; } },
  { path: 'lazy-namespace', loadComponent: async () => { const cards = await import('./barrel'); return cards.${ref('dynamic', 'lazy-namespace')}; } },
  { path: 'lazy-routes', loadChildren: () => import('./child.routes').then(m => m.childRoutes) },
  { path: 'lazy-module', loadChildren: () => import('./legacy').then(m => m.LazyLegacyModule) },
  { path: 'nested', component: ModernPage, children: [{ path: 'child', component: ${ref('dynamic', 'nested-route')} }, { path: 'aux', outlet: 'aux', component: ${ref('dynamic', 'named-outlet-route')} }] },
  { path: 'registry', component: ROUTE_TYPES.main },
  { path: 'conditional', loadComponent: () => Promise.resolve(Math.random() > .5 ? ${ref('dynamic', 'conditional-route')} : OtherCard) },
];
`);
  put('src/child.routes.ts', `
import { Routes } from '@angular/router';
import { ${ref('dynamic', 'child-import')} } from './barrel';
export const childRoutes: Routes = [{ path: '', component: ${ref('dynamic', 'child-route')} }];
`);
  put('src/lazy-code.ts', `
import { MatDialog } from '@angular/material/dialog';
import { ViewContainerRef } from '@angular/core';
export async function openLazy(dialog: MatDialog, view: ViewContainerRef) {
  const { ${ref('dynamic', 'code-binding')}: ${ref('dynamic', 'code-alias', 'LazyDialog')} } = await import('./barrel');
  dialog.open(${ref('dynamic', 'code-dialog', 'LazyDialog')});
  view.createComponent(${ref('dynamic', 'code-create', 'LazyDialog')});
}
export async function openDefault(dialog: MatDialog) {
  const { ${ref('dynamic', 'default-binding', 'default')}: ${ref('dynamic', 'default-alias', 'LazyDefault')} } = await import('./default-card');
  dialog.open(${ref('dynamic', 'default-dialog', 'LazyDefault')});
}
`);

  const point = (source, offset) => { const lines = source.slice(0, offset).split('\n'); return { line: lines.length, column: lines.at(-1).length + 1 }; };
  for (const [file, source] of files) {
    for (const match of source.matchAll(/\/\*@use:(\w+):([\w-]+)\*\/([\w]+)/g)) {
      const start = match.index + match[0].length - match[3].length;
      expected.push({ target: match[1], id: match[2], file, text: match[3], range: { start: point(source, start), end: point(source, start + match[3].length) }, kind: 'typescript-reference' });
    }
    for (const item of cases) {
      const offset = source.indexOf(item.opening);
      if (offset >= 0) expected.push({ ...item, file, range: { start: point(source, offset), end: point(source, offset + item.opening.length) } });
    }
    await mkdir(path.dirname(path.join(workspace, file)), { recursive: true });
    await writeFile(path.join(workspace, file), source);
  }
  if (expected.filter(e => e.kind === 'template-occurrence').length !== cases.length) throw new Error('Every authored case must occur exactly once');
  await writeFile(path.join(workspace, 'oracle.json'), JSON.stringify({ expected, forbiddenFiles: ['src/other.ts'], deepNesting: 48 }, null, 2));
  return { expected, files: [...files.keys(), 'oracle.json'], symbols };
}
