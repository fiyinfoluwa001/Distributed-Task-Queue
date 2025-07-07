import express from 'express'
import {Queue} from 'bullmq'
import {createBullBoard} from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express'