import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';

describe('App shell', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('creates the root component', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the primary navigation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    const links = Array.from(element.querySelectorAll('nav a')).map((a) =>
      a.textContent?.trim(),
    );

    expect(links).toContain('Home');
    expect(links).toContain('Review');
  });

  it('provides a skip link for keyboard users', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    const skipLink = element.querySelector('a[href="#main-content"]');
    expect(skipLink).toBeTruthy();
    expect(element.querySelector('#main-content')).toBeTruthy();
  });
});
