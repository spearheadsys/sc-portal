import { Component, OnInit } from '@angular/core';
import { ColumnMode, SelectionType } from '@swimlane/ngx-datatable';
import { CatalogService } from '../helpers/catalog.service';

@Component({
  selector: 'app-docker-images',
  templateUrl: './docker-images.component.html',
  styleUrls: ['./docker-images.component.scss']
})
export class DockerImagesComponent implements OnInit
{
  rows: any[] = [];
  loadingIndicator = true;
  selectionType = SelectionType;
  columnMode = ColumnMode;

  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly catalogService: CatalogService)
  {

  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnInit(): void
  {
  }

}
