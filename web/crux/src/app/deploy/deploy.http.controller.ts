import { Controller, Post, Body, Get, UseGuards, UseInterceptors, UseFilters } from '@nestjs/common'
import { ApiBody, ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger'
import { AuditLogLevel } from 'src/decorators/audit-logger.decorator'
import HttpExceptionFilter from 'src/filters/http-exception.filter'
import { Empty } from 'src/grpc/protobuf/proto/common'
import { CreateDeploymentRequest, CreateEntityResponse, IdRequest } from 'src/grpc/protobuf/proto/crux'
import HttpLoggerInterceptor from 'src/interceptors/http.logger.interceptor'
import PrismaErrorInterceptor from 'src/interceptors/prisma-error-interceptor'
import {
  CreateDeploymentRequestDto,
  CreateEntityResponseDto,
  IdRequestDto,
  DeploymentEventsDto,
} from 'src/swagger/crux.dto'
import { Identity } from '@ory/kratos-client'
import { HttpIdentityInterceptor, IdentityFromRequest } from 'src/interceptors/http.identity.interceptor'
import JwtAuthGuard from '../token/jwt-auth.guard'
import DeployService from './deploy.service'
import DeployStartValidationPipe from './pipes/deploy.start.pipe'

@UseGuards(JwtAuthGuard)
@UseInterceptors(HttpLoggerInterceptor, PrismaErrorInterceptor, HttpIdentityInterceptor)
@UseFilters(HttpExceptionFilter)
@AuditLogLevel('disabled')
@Controller('deploy')
export default class DeployHttpController {
  constructor(private service: DeployService) {}

  @Post()
  @ApiBody({ type: CreateDeploymentRequestDto })
  @ApiCreatedResponse({ type: CreateEntityResponseDto })
  @AuditLogLevel('disabled')
  async createDeployment(
    @Body() request: CreateDeploymentRequest,
    @IdentityFromRequest() identity: Identity,
  ): Promise<CreateEntityResponse> {
    return this.service.createDeployment(request, identity)
  }

  @Post('start')
  @ApiBody({ type: IdRequestDto })
  @ApiOkResponse()
  @AuditLogLevel('disabled')
  async startDeployment(
    @Body(DeployStartValidationPipe) request: IdRequest,
    @IdentityFromRequest() identity: Identity,
  ): Promise<Empty> {
    return await this.service.startDeployment(request, identity)
  }

  @Get('events')
  @ApiBody({ type: IdRequestDto })
  @ApiOkResponse({ type: DeploymentEventsDto })
  @AuditLogLevel('disabled')
  async getDeploymentEvents(@Body() request: IdRequest): Promise<DeploymentEventsDto> {
    return await this.service.getDeploymenEventsById(request)
  }
}
