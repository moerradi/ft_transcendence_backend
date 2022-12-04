# create env file if not present
if [ ! -f ../.env ]; then
	touch ../.env
	echo "DATABASE_URL=postgresql://postgres:mysecretpassword@localhost:5432/db?schema=public" > ../.env
fi

# create alpine net if not present
if [ ! "$(docker network ls | grep alpine-net)" ]; then
	docker network create alpine-net
fi

#create volume if not present
if [ ! "$(docker volume ls | grep db-data)" ]; then
    # check if $HELPER_DRIVE is set
	if [ -z "$HELPER_DRIVE" ]; then
		docker volume create db-data --driver local --opt type=none --opt device=$HOME/ --opt o=bind
	else
		docker volume create db-data --driver local --opt type=none --opt device=$HELPER_DRIVE/db-data --opt o=bind
	fi
fi

# start docker container if not already started
if [ ! "$(docker ps -a | grep postgres)" ]; then
	docker run -d -p 5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=mysecretpassword -e POSTGRES_DB=db --network alpine-net --name postgres -v db-data:/var/lib/postgresql/data postgres
fi