import { inngest } from './client'
import prisma from '@/lib/prisma'

// Inngest function to save user data to a database
export const syncUserCreation = inngest.createFunction(
    { id: 'sync-user-create' },
    { event: 'clerk/user.created' },
    async ({ event }) => {
        try {
            const { data } = event
            
            // Validate required fields
            if (!data.id) {
                throw new Error('User ID is missing from event data')
            }
            
            if (!data.email_addresses || data.email_addresses.length === 0) {
                throw new Error('Email address is missing from event data')
            }

            await prisma.user.create({
                data: {
                    id: data.id,
                    email: data.email_addresses[0].email_address,
                    name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
                    image: data.image_url || null,
                }
            })
            
            console.log(`User ${data.id} created successfully`)
        } catch (error) {
            console.error('Error creating user:', error)
            throw error
        }
    }
)

// Inngest function to update user data in a database
export const syncUserUpdation = inngest.createFunction(
    { id: 'sync-user-update' },
    { event: 'clerk/user.updated' },
    async ({ event }) => {
        try {
            const { data } = event
            
            // Validate required fields
            if (!data.id) {
                throw new Error('User ID is missing from event data')
            }
            
            if (!data.email_addresses || data.email_addresses.length === 0) {
                throw new Error('Email address is missing from event data')
            }

            await prisma.user.update({
                where: {
                    id: data.id,
                },
                data: {
                    email: data.email_addresses[0].email_address,
                    name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
                    image: data.image_url || null,
                }
            })
            
            console.log(`User ${data.id} updated successfully`)
        } catch (error) {
            console.error('Error updating user:', error)
            throw error
        }
    }
)

// Inngest function to delete user data from a database
export const syncUserDeletion = inngest.createFunction(
    { id: 'sync-user-delete' },
    { event: 'clerk/user.deleted' },
    async ({ event }) => {
        try {
            const { data } = event
            
            // Validate required field
            if (!data.id) {
                throw new Error('User ID is missing from event data')
            }

            await prisma.user.delete({
                where: { 
                    id: data.id 
                }
            })
            
            console.log(`User ${data.id} deleted successfully`)
        } catch (error) {
            console.error('Error deleting user:', error)
            throw error
        }
    }
)