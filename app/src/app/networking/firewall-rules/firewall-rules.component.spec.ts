import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FirewallRulesComponent } from './firewall-rules.component';

describe('FirewallRulesComponent', () => {
  let component: FirewallRulesComponent;
  let fixture: ComponentFixture<FirewallRulesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FirewallRulesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FirewallRulesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
