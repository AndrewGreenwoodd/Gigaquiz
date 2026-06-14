import {
  Controller, Get, Post, Put, Delete, Param, Body,
  UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PacksService } from './packs.service';
import { CreatePackDto } from './dto/create-pack.dto';
import { CloudinaryService } from './cloudinary.service';

@Controller('packs')
export class PacksController {
  constructor(
    private readonly packsService: PacksService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get()
  findAll() {
    return this.packsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.packsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreatePackDto) {
    return this.packsService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: CreatePackDto) {
    return this.packsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.packsService.remove(id);
  }

  @Post('upload/image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    const url = await this.cloudinaryService.uploadImage(file);
    return { url };
  }
}
