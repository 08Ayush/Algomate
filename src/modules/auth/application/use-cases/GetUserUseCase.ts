import { IUserRepository } from '../../domain/repositories/IUserRepository';

/**
 * Get User Use Case
 * 
 * Retrieves user information by ID
 */
export class GetUserUseCase {
    constructor(private readonly userRepository: IUserRepository) { }

    /**
     * Execute get user
     */
    async execute(userId: string) {
        const user = await this.userRepository.findById(userId);

        if (!user) {
            return null;
        }

        return user.toSafeJSON();
    }
}
