import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { filter } from 'rxjs/operators';
import { TokenService } from '../../helpers/token.service';

@Component({
  selector: 'app-nav-menu',
  templateUrl: './nav-menu.component.html',
  styleUrls: ['./nav-menu.component.scss']
})
export class NavMenuComponent implements OnInit
{
  @Output()
  navigate = new EventEmitter();

  isAuthenticated = false;

  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly router: Router,
    private readonly tokenService: TokenService)
  {
    router.events
      .pipe(filter(e => e instanceof NavigationStart))
      .subscribe(e => this.navigate.emit(e));

    tokenService.accessTokenUpdated$.subscribe(x => this.isAuthenticated = !!x);
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnInit(): void
  {
  }
}
