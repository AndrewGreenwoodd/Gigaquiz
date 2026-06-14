import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePackDto } from './dto/create-pack.dto';

const PACK_INCLUDE = {
  categories: {
    orderBy: { order: 'asc' as const },
    include: {
      questions: { orderBy: { order: 'asc' as const } },
    },
  },
};

@Injectable()
export class PacksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.questionPack.findMany({
      where: { isPublic: true },
      include: PACK_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const pack = await this.prisma.questionPack.findUnique({
      where: { id },
      include: PACK_INCLUDE,
    });
    if (!pack) throw new NotFoundException('Pack not found');
    return pack;
  }

  async create(dto: CreatePackDto) {
    return this.prisma.questionPack.create({
      data: {
        name: dto.name,
        description: dto.description,
        authorName: dto.authorName,
        isPublic: dto.isPublic ?? true,
        timerDuration: dto.timerDuration ?? 5,
        categories: {
          create: dto.categories.map((cat) => ({
            name: cat.name,
            order: cat.order,
            questions: {
              create: cat.questions.map((q) => ({
                text: q.text,
                answer: q.answer,
                points: q.points,
                imageUrl: q.imageUrl,
                order: q.order,
              })),
            },
          })),
        },
      },
      include: PACK_INCLUDE,
    });
  }

  async update(id: string, dto: Partial<CreatePackDto>) {
    await this.findOne(id);

    await this.prisma.questionPack.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        authorName: dto.authorName,
        isPublic: dto.isPublic,
        timerDuration: dto.timerDuration,
      },
    });

    if (dto.categories) {
      await this.prisma.category.deleteMany({ where: { packId: id } });
      await this.prisma.questionPack.update({
        where: { id },
        data: {
          categories: {
            create: dto.categories.map((cat) => ({
              name: cat.name,
              order: cat.order,
              questions: {
                create: cat.questions.map((q) => ({
                  text: q.text,
                  answer: q.answer,
                  points: q.points,
                  imageUrl: q.imageUrl,
                  order: q.order,
                })),
              },
            })),
          },
        },
      });
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.questionPack.delete({ where: { id } });
  }
}
