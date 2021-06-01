import { FileSizePipe } from './file-size.pipe';

describe('FileSizePipe', () => {
  it('create an machine', () => {
    const pipe = new FileSizePipe();
    expect(pipe).toBeTruthy();
  });
});
