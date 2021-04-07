import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { ColumnMode, SelectionType } from '@swimlane/ngx-datatable';
import { CatalogService } from '../helpers/catalog.service';

@Component({
  selector: 'app-images',
  templateUrl: './images.component.html',
  styleUrls: ['./images.component.scss']
})
export class ImagesComponent implements OnInit
{
  @Output()
  select = new EventEmitter();

  images: any[];
  loadingIndicator = true;
  selectionType = SelectionType;
  columnMode = ColumnMode;

  // ----------------------------------------------------------------------------------------------------------------
  constructor(private readonly catalogService: CatalogService)
  {
    catalogService.getImages().subscribe(x =>
    {
      this.images = x;

      this.loadingIndicator = false;
    });

    catalogService.getDataCenters().subscribe(console.log);
  }

  // ----------------------------------------------------------------------------------------------------------------
  ngOnInit(): void
  {
  }
}
