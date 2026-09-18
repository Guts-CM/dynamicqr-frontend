import { Component, DestroyRef, ElementRef, Injector, afterNextRender, inject, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { SectionTransitionService } from './motion/section-transition';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'dynamicqr-frontend';

  private readonly router = inject(Router);
  private readonly transitions = inject(SectionTransitionService);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');

  private currentUrl = this.router.url;
  private pendingFrom: string | null = null;
  private pendingGen = 0;
  private hasEntered = false;

  constructor() {
    this.router.events
      .pipe(
        filter(
          (event) =>
            event instanceof NavigationStart ||
            event instanceof NavigationEnd ||
            event instanceof NavigationCancel ||
            event instanceof NavigationError,
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        if (event instanceof NavigationStart) {
          this.onNavigationStart(event.url);
          return;
        }

        if (event instanceof NavigationEnd) {
          this.onNavigationEnd(event.urlAfterRedirects);
          return;
        }

        this.onNavigationAbort();
      });

    afterNextRender(() => {
      if (this.hasEntered) {
        return;
      }

      this.hasEntered = true;
      this.currentUrl = this.router.url;
      const host = this.routedHost();
      if (host) {
        this.transitions.animateSectionEnter(host, { initial: true, direction: 0 });
      }
    });
  }

  private onNavigationStart(url: string): void {
    this.pendingFrom = this.currentUrl;
    if (!this.hasEntered || this.transitions.sameSection(this.currentUrl, url)) {
      return;
    }

    this.pendingGen = this.transitions.nextGeneration();
    const host = this.routedHost();
    if (host) {
      this.transitions.animateSectionLeave(host, this.transitions.direction(this.currentUrl, url));
    }
  }

  private onNavigationEnd(url: string): void {
    const from = this.pendingFrom;
    const generation = this.pendingGen;
    const same = this.transitions.sameSection(from, url);
    this.currentUrl = url;

    if (!this.hasEntered || same) {
      return;
    }

    afterNextRender(
      () => {
        if (!this.transitions.isCurrent(generation)) {
          return;
        }

        const host = this.routedHost();
        if (!host) {
          return;
        }

        this.transitions.animateSectionEnter(host, {
          direction: this.transitions.direction(from, url),
          initial: false,
        });
      },
      { injector: this.injector },
    );
  }

  private onNavigationAbort(): void {
    const host = this.routedHost();
    if (host) {
      this.transitions.resetSectionState(host);
    }
  }

  private routedHost(): HTMLElement | null {
    const stage = this.stage()?.nativeElement;
    if (!stage) {
      return null;
    }

    return ([...stage.children] as HTMLElement[]).find((node) => node.tagName !== 'ROUTER-OUTLET') ?? null;
  }
}
