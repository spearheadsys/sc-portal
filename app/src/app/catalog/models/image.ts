export class CatalogImage
{
  id: string;
  name: string;
  version: string;
  description: string;
  owner: string;
  public: boolean;
  published_at: Date;
  state: string;
  type: string;
  os: string;
  tags: { key: string; value: string };
  requirements: any;
  homepage: string;
  image_size: number;
  price: number;
}
