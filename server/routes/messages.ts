import express, { Request, Response } from 'express'
import amqplib, { Channel, Connection } from 'amqplib'

const router = express.Router()

let channel: Channel, connection: Connection
const API_KEY = process.env.API_KEY

connect()

async function connect() {
    try {
        const amqpServer = `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@rabbitmq:5672`
        connection = await amqplib.connect(amqpServer)
        channel = await connection.createChannel()
        await channel.assertExchange('communication_exchange', 'topic')
    } catch (error) {
        console.log(error)
        throw error
    }
}

function sendToQueueAndRespond(
    queueName: string,
    data: Record<string, any>,
    res: Response
) {
    channel.sendToQueue(
        queueName,
        Buffer.from(JSON.stringify({ ...data, date: new Date() }))
    )

    return res.status(201).json({ message: 'Message sent successfully' })
}

function handleMicroserviceRoute(
    routeName: string,
    queueName: string,
    validOperationIds: string[],
    operationIdsWithMessage: string[]
) {
    router.post(`/${routeName}`, (req: Request, res: Response) => {
        const apiKey = req.headers['x-api-key']
        if (!apiKey || apiKey !== API_KEY) {
            return res
                .status(403)
                .json({ error: 'Unauthorized. You need a valid API key' })
        }
        const data = req.body
        if (data.length === 0) {
            return res.status(400).send('No data was sent')
        }
        if (req.get('Content-Type') !== 'application/json') {
            return res.status(400).send('The content must be a JSON object')
        }
        if (!data.operationId) {
            return res
                .status(400)
                .send('The content must contain the operationId property')
        } else {
            if (validOperationIds.includes(data.operationId)) {
                if (operationIdsWithMessage.includes(data.operationId)) {
                    if (!data.message) {
                        return res
                            .status(400)
                            .send(
                                'The content must contain the message property'
                            )
                    }
                }
            } else {
                return res.status(400).send('Invalid operationId')
            }
            sendToQueueAndRespond(queueName, data, res)
        }
    })
}

handleMicroserviceRoute(
    'users-microservice',
    'users_microservice',
    ['requestAppUsers', 'notificationNewPlanPayment', 'responseUserReviews'],
    ['notificationNewPlanPayment', 'responseUserReviews']
)
handleMicroserviceRoute(
    'mailbox-microservice',
    'mailbox_microservice',
    ['responseAppUsers'],
    ['responseAppUsers']
)
handleMicroserviceRoute(
    'reviews-microservice',
    'reviews_microservice',
    ['requestUserReviews', 'requestCourseReviews', 'requestMaterialReviews'],
    ['requestUserReviews', 'requestCourseReviews', 'requestMaterialReviews']
)
handleMicroserviceRoute(
    'courses-microservice',
    'courses_microservice',
    [
        'publishNewAccess',
        'responseAppClassesAndMaterials',
        'responseCourseReviews',
        'notificationNewClass',
        'notificationDeleteClass',
        'notificationAssociateMaterial',
        'notificationDisassociateMaterial',
    ],
    [
        'publishNewAccess',
        'responseAppClassesAndMaterials',
        'responseCourseReviews',
        'notificationNewClass',
        'notificationDeleteClass',
        'notificationAssociateMaterial',
        'notificationDisassociateMaterial',
    ]
)
handleMicroserviceRoute(
    'payment-history-microservice',
    'payment_history_microservice',
    ['notificationNewPayment'],
    ['notificationNewPayment']
)
handleMicroserviceRoute(
    'payment-microservice',
    'payment_microservice',
    ['notificationUserPlanInfo'],
    ['notificationUserPlanInfo']
)
handleMicroserviceRoute(
    'access-control-microservice',
    'access_control_microservice',
    ['notificationNewCourseOrMaterialBought'],
    ['notificationNewCourseOrMaterialBought']
)
handleMicroserviceRoute(
    'learning-microservice',
    'learning_microservice',
    [
        'responseMaterialReviews',
        'requestAppClassesAndMaterials',
        'publishNewAccess',
    ],
    [
        'responseMaterialReviews',
        'requestAppClassesAndMaterials',
        'publishNewAccess',
    ]
)

export default router
