import { Component, OnInit } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { StaticHtmlService } from '../../helpers/static-html.service';

@Component({
  selector: 'app-help',
  templateUrl: './help.component.html',
  styleUrls: ['./help.component.scss']
})
export class HelpComponent implements OnInit
{
  helpTopics = [
    {
      title: 'Completing account information',
      contentUrl: './assets/help/account-info.html'
    },
    {
      title: 'Provisioning compute instance',
      contentUrl: ''
    },
    {
      title: 'Managing instances with Triton CLI',
      contentUrl: ''
    }
  ];

  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly staticHtmlService: StaticHtmlService,
    private readonly domSanitizer: DomSanitizer)
  {
  }

  // ----------------------------------------------------------------------------------------------------------------
  getHelpTopicContent(isOpen, helpTopic)
  {
    helpTopic.expanded = isOpen;

    if (!isOpen || !helpTopic.contentUrl || helpTopic.content) return;

    helpTopic.loading = true;

    this.staticHtmlService
      .getStaticHtml(helpTopic.contentUrl, helpTopic.contentUrl.startsWith(window.location.origin))
      .subscribe(response =>
      {
        helpTopic.content = this.domSanitizer.bypassSecurityTrustHtml(response);
        helpTopic.loading = false;
      }, err =>
      {
        helpTopic.content = err.error?.message;
        helpTopic.loading = false;
      });
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnInit(): void
  {

  }
}
