import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FirewallRuleEditorComponent } from './firewall-rule-editor.component';

describe('FirewallRuleEditorComponent', () => {
  let component: FirewallRuleEditorComponent;
  let fixture: ComponentFixture<FirewallRuleEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FirewallRuleEditorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FirewallRuleEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
